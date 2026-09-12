import { Body, Controller, Get, Inject, Logger, Post, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  KeyRing,
  MvcModule,
  SkipCsrf,
  ValidationException,
  View,
  ViewService,
  csrfSettings,
  type MvcModuleOptions,
} from '../src/index'

const KEY = 'csrf-test-key-'.padEnd(43, 'k')
const OLD_KEY = 'csrf-old-key-'.padEnd(43, 'o')

describe('csrfSettings', () => {
  it('is on by default, with the token', () => {
    expect(csrfSettings(undefined, { NODE_ENV: 'production' })).toEqual({ token: true })
    expect(csrfSettings(undefined, {})).toEqual({ token: true })
  })

  it('is off under a test runner unless asked for, and off when switched off', () => {
    expect(csrfSettings(undefined, { NODE_ENV: 'test' })).toBeUndefined()
    expect(csrfSettings(true, { NODE_ENV: 'test' })).toEqual({ token: true })
    expect(csrfSettings({}, { NODE_ENV: 'test' })).toEqual({ token: true })
    expect(csrfSettings(false, {})).toBeUndefined()
  })

  it('can keep only the origin check', () => {
    expect(csrfSettings({ token: false }, {})).toEqual({ token: false })
  })
})

// ── the wire, on both platforms ──────────────────────────────────────────────

@Controller()
class FormsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('form')
  @View('Form')
  form() {
    return {}
  }

  @Post('save')
  save() {
    return this.view.flash('message', 'Saved').back()
  }

  @Post('validate')
  validate(@Body() body: { name?: string }) {
    if (!body?.name) throw new ValidationException({ name: 'Required.' })
    return this.view.back()
  }

  @Post('hook')
  @SkipCsrf()
  hook() {
    return { received: true }
  }
}

@Controller('api')
@SkipCsrf()
class ApiController {
  @Post('open')
  open() {
    return { ok: true }
  }

  @Post('guarded')
  @SkipCsrf(false)
  guarded() {
    return { ok: true }
  }
}

type Platform = 'express' | 'fastify'
const HOST = 'app.test'

async function boot(platform: Platform, options: MvcModuleOptions = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], csrf: true, ...options })],
    controllers: [FormsController, ApiController],
  }).compile()
  const app =
    platform === 'fastify'
      ? moduleRef.createNestApplication(new FastifyAdapter() as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
  await app.init()
  if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  return app
}

const setCookies = (res: request.Response): string[] => (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
const xsrfLine = (res: request.Response) => setCookies(res).find((c) => c.startsWith('XSRF-TOKEN='))
const xsrfValue = (res: request.Response) => decodeURIComponent(xsrfLine(res)!.split(';')[0].slice('XSRF-TOKEN='.length))

describe.each<Platform>(['express', 'fastify'])('CSRF on the wire (%s)', (platform) => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
  })

  /** A token the way a browser gets one: from a page. */
  async function token(): Promise<string> {
    return xsrfValue(await request(app.getHttpServer()).get('/form').set('Host', HOST))
  }

  /**
   * A same-origin request from the client's HTTP client: cookie, echoed header,
   * Sec-Fetch-Site. Without `X-Inertia`, like `useHttp`, so a 419 stays a 419 —
   * on an Inertia visit it becomes a redirect back (`error-redirects.test.ts`).
   */
  function post(path: string, value: string | undefined, headers: Record<string, string> = {}) {
    let test = request(app.getHttpServer()).post(path).set('Host', HOST).set('Referer', `http://${HOST}/form`)
    if (value !== undefined) test = test.set('Cookie', `XSRF-TOKEN=${encodeURIComponent(value)}`).set('X-XSRF-TOKEN', value)
    for (const [name, v] of Object.entries({ 'Sec-Fetch-Site': 'same-origin', ...headers })) {
      if (v !== '') test = test.set(name, v)
    }
    return test
  }

  it('hands a page its token: readable by the client, SameSite=Lax, signed', async () => {
    app = await boot(platform)
    const res = await request(app.getHttpServer()).get('/form').set('Host', HOST)
    const line = xsrfLine(res)!
    expect(line).toMatch(/^XSRF-TOKEN=[\w-]{43}\.[\w-]{43}; Path=\/; SameSite=Lax$/)
    expect(new KeyRing([KEY]).verify('csrf', xsrfValue(res))).toBeDefined()
  })

  it('leaves a valid token alone and replaces a forged one', async () => {
    app = await boot(platform)
    const valid = await token()
    const again = await request(app.getHttpServer()).get('/form').set('Cookie', `XSRF-TOKEN=${valid}`)
    expect(xsrfLine(again)).toBeUndefined()

    const forged = await request(app.getHttpServer()).get('/form').set('Cookie', 'XSRF-TOKEN=made-up.value')
    expect(xsrfValue(forged)).not.toBe('made-up.value')
  })

  it('lets a same-origin request with the echoed token through', async () => {
    app = await boot(platform)
    const res = await post('/save', await token())
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(`http://${HOST}/form`)
  })

  it('answers 419 with a fresh token when the token is missing, wrong or not ours', async () => {
    app = await boot(platform)
    const valid = await token()
    const other = new KeyRing(['another-app-key-'.padEnd(43, 'x')]).sign('csrf', 'abc')
    const unsigned = 'x'.repeat(87)

    const missing = await post('/save', undefined)
    const mismatched = await post('/save', valid).set('X-XSRF-TOKEN', await token())
    const forged = await post('/save', unsigned)
    const foreign = await post('/save', other)
    const otherPurpose = await post('/save', new KeyRing([KEY]).sign('flash', 'abc'))

    for (const res of [missing, mismatched, forged, foreign, otherPurpose]) {
      expect(res.status).toBe(419)
      expect(res.body).toMatchObject({ statusCode: 419, message: 'CSRF token mismatch.' })
      expect(xsrfLine(res)).toBeDefined()
    }
    // The fresh token works on the retry.
    expect((await post('/save', xsrfValue(missing))).status).toBe(302)
  })

  it('refuses what the browser says comes from another site, token or not', async () => {
    app = await boot(platform)
    const valid = await token()
    expect((await post('/save', valid, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
    expect((await post('/save', valid, { 'Sec-Fetch-Site': 'same-site' })).status).toBe(403)
    expect((await post('/save', valid, { 'Sec-Fetch-Site': 'none' })).status).toBe(302)
  })

  it('falls back to Origin for browsers without Sec-Fetch-Site, and to the token without either', async () => {
    app = await boot(platform)
    const valid = await token()
    const noFetchSite = { 'Sec-Fetch-Site': '' }
    expect((await post('/save', valid, { ...noFetchSite, Origin: `http://${HOST}` })).status).toBe(302)
    expect((await post('/save', valid, { ...noFetchSite, Origin: 'https://evil.example' })).status).toBe(403)
    expect((await post('/save', valid, { ...noFetchSite, Origin: 'null' })).status).toBe(403)
    expect((await post('/save', valid, noFetchSite)).status).toBe(302)
    expect((await post('/save', undefined, noFetchSite)).status).toBe(419)
  })

  it('keeps only the origin check with token: false', async () => {
    app = await boot(platform, { csrf: { token: false } })
    const page = await request(app.getHttpServer()).get('/form')
    expect(xsrfLine(page)).toBeUndefined()
    expect((await post('/save', undefined)).status).toBe(302)
    expect((await post('/save', undefined, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
  })

  it('does nothing with csrf: false', async () => {
    app = await boot(platform, { csrf: false })
    expect(xsrfLine(await request(app.getHttpServer()).get('/form'))).toBeUndefined()
    expect((await post('/save', undefined, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(302)
  })

  it('skips what @SkipCsrf() marks, and the handler wins over the controller', async () => {
    app = await boot(platform)
    const crossSite = { 'Sec-Fetch-Site': 'cross-site' }
    expect((await post('/hook', undefined, crossSite)).status).toBe(201)
    expect((await post('/api/open', undefined, crossSite)).status).toBe(201)
    expect((await post('/api/guarded', undefined, crossSite)).status).toBe(403)
    expect((await post('/api/guarded', undefined)).status).toBe(419)
  })

  it('covers Precognition: a validate-only request needs the token too', async () => {
    app = await boot(platform)
    const precognitive = (value: string | undefined) => post('/validate', value).set('Precognition', 'true').send({})
    expect((await precognitive(undefined)).status).toBe(419)
    // Past the guard: Precognition runs the pipes only (none here) and answers 204.
    expect((await precognitive(await token())).status).toBe(204)
  })

  it('accepts a token signed with a previous key', async () => {
    app = await boot(platform, { keys: [KEY, OLD_KEY] })
    const old = new KeyRing([OLD_KEY]).sign('csrf', 'y'.repeat(43))
    expect((await post('/save', old)).status).toBe(302)
  })

  it('marks the cookie Secure when the app is served over https', async () => {
    app = await boot(platform, { url: `https://${HOST}` })
    expect(xsrfLine(await request(app.getHttpServer()).get('/form'))).toMatch(/; Secure$/)
  })

  it('writes each cookie once when the token and the flash bag share a response', async () => {
    app = await boot(platform)
    const saved = await post('/save', await token())
    const flash = setCookies(saved).find((c) => c.startsWith('mvc_flash='))!.split(';')[0]

    // The render consumes the flash bag (clears its cookie) and, without a token, is handed one.
    const page = await request(app.getHttpServer()).get('/form').set('X-Inertia', 'true').set('X-Inertia-Version', 'v1').set('Cookie', flash)
    expect(page.body.flash).toEqual({ message: 'Saved' })
    const names = setCookies(page).map((c) => c.split('=')[0])
    expect(names.sort()).toEqual(['XSRF-TOKEN', 'mvc_flash'])
  })
})

describe('switching CSRF off', () => {
  const env = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = env
    vi.restoreAllMocks()
  })

  it('warns at boot outside tests', async () => {
    process.env.NODE_ENV = 'development'
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    await Test.createTestingModule({ imports: [MvcModule.forRoot({ csrf: false, keys: [KEY] })] }).compile()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('CSRF protection is off'))
  })
})
