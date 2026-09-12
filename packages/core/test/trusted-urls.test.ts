import { Controller, Get, Inject, Post, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  MvcModule,
  ValidationException,
  View,
  ViewService,
  absoluteUrl,
  isSafeRedirect,
  previousUrl,
  requestOrigin,
  type AnyRequest,
  type MvcModuleOptions,
} from '../src/index'

// ── units ─────────────────────────────────────────────────────────────────────

const req = (headers: Record<string, string>, extra: Partial<AnyRequest> = {}): AnyRequest => ({ headers, ...extra })
const local = req({ host: 'localhost:3000' })

describe('requestOrigin', () => {
  it('uses the socket and the Host header on a raw request, and nothing forwarded', () => {
    const forged = req({ host: 'localhost:3000', 'x-forwarded-host': 'evil.com', 'x-forwarded-proto': 'https' })
    expect(requestOrigin(forged)).toBe('http://localhost:3000')
    expect(absoluteUrl({ ...forged, url: '/a?b=1' })).toBe('http://localhost:3000/a?b=1')
  })

  it('believes the platform: protocol and host are already trust-proxy aware there', () => {
    expect(requestOrigin(req({ host: 'internal:8080' }, { protocol: 'https', host: 'app.example.com' }))).toBe(
      'https://app.example.com',
    )
  })

  it('lets the configured url win, and normalises default ports', () => {
    expect(requestOrigin(local, 'https://app.example.com/some/path')).toBe('https://app.example.com')
    expect(requestOrigin(req({ host: 'app.example.com:80' }))).toBe('http://app.example.com')
  })

  it('says nothing when the request has no usable host', () => {
    expect(requestOrigin(req({}))).toBeUndefined()
    expect(requestOrigin(req({ host: 'bad host' }))).toBeUndefined()
  })
})

describe('isSafeRedirect', () => {
  it.each(['/', '/dashboard', '/a/b?c=d#e', 'http://localhost:3000/contacts', 'HTTP://localhost:3000/'])(
    'keeps %s',
    (url) => expect(isSafeRedirect(url, local)).toBe(true),
  )

  it.each([
    ['scheme-relative', '//evil.com'],
    ['backslash repaired to //', '/\\evil.com'],
    ['double backslash', '\\\\evil.com'],
    ['tab stripped by the browser', '/\t/evil.com'],
    ['newline', '/\n/evil.com'],
    ['leading space', ' /dashboard'],
    ['DEL', '/\u007f/evil.com'],
    ['scheme without slashes', 'https:evil.com'],
    ['same scheme without slashes', 'http:evil.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,hi'],
    ['bare word', 'dashboard'],
    ['other host', 'http://evil.com/'],
    ['other scheme on this host', 'https://localhost:3000/'],
    ['other port', 'http://localhost:4000/'],
    ['userinfo trick', 'http://localhost:3000@evil.com/'],
    ['empty', ''],
  ])('refuses %s (%s)', (_label, url) => expect(isSafeRedirect(url, local)).toBe(false))

  it('refuses undefined', () => expect(isSafeRedirect(undefined, local)).toBe(false))

  it('checks against the configured url when there is one', () => {
    const internal = req({ host: 'internal:8080' })
    expect(isSafeRedirect('https://app.example.com/x', internal, 'https://app.example.com')).toBe(true)
    expect(isSafeRedirect('http://internal:8080/x', internal, 'https://app.example.com')).toBe(false)
  })
})

describe('previousUrl', () => {
  it('is the Referer when it is on this app, else the fallback', () => {
    expect(previousUrl(req({ host: 'localhost:3000', referer: 'http://localhost:3000/form' }))).toBe(
      'http://localhost:3000/form',
    )
    expect(previousUrl(req({ host: 'localhost:3000', referer: 'https://evil.com/phish' }))).toBe('/')
    expect(previousUrl(req({ host: 'localhost:3000', referer: 'https://evil.com/' }), '/contacts')).toBe('/contacts')
    expect(previousUrl(local, '/home')).toBe('/home')
  })
})

// ── the wire, on both platforms ──────────────────────────────────────────────

@Controller()
class BackController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('page')
  @View('Page')
  page() {
    return {}
  }

  @Post('save')
  save() {
    return this.view.back()
  }

  @Post('save-or-contacts')
  saveOrContacts() {
    return this.view.back('/contacts')
  }

  @Post('invalid')
  invalid() {
    throw new ValidationException({ name: 'Required.' })
  }
}

type Platform = 'express' | 'fastify'

async function boot(platform: Platform, options: MvcModuleOptions = {}, trustProxy = false): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', ...options })],
    controllers: [BackController],
  }).compile()
  const app =
    platform === 'fastify'
      ? moduleRef.createNestApplication(new FastifyAdapter({ trustProxy }) as never, { logger: false })
      : moduleRef.createNestApplication<NestExpressApplication>({ logger: false })
  if (platform === 'express' && trustProxy) (app as NestExpressApplication).set('trust proxy', true)
  await app.init()
  if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  return app
}

describe.each<Platform>(['express', 'fastify'])('trusted urls on the wire (%s)', (platform) => {
  const inertia = (test: request.Test) => test.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  it('answers a version mismatch with the relative path, whatever X-Forwarded-Host says', async () => {
    const app = await boot(platform)
    const res = await request(app.getHttpServer())
      .get('/page?tab=2')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'stale')
      .set('X-Forwarded-Host', 'evil.com')
      .set('X-Forwarded-Proto', 'https')
    expect(res.status).toBe(409)
    expect(res.headers['x-inertia-location']).toBe('/page?tab=2')
    await app.close()
  })

  it('follows a same-origin Referer and refuses a cross-origin one', async () => {
    const app = await boot(platform)
    const host = 'app.test'
    const back = (referer?: string, path = '/save') => {
      const test = inertia(request(app.getHttpServer()).post(path).set('Host', host))
      return referer ? test.set('Referer', referer) : test
    }

    expect((await back(`http://${host}/page`)).headers.location).toBe(`http://${host}/page`)
    expect((await back('/page')).headers.location).toBe('/page')
    expect((await back('https://evil.com/phish')).headers.location).toBe('/')
    expect((await back('//evil.com/phish')).headers.location).toBe('/')
    expect((await back()).headers.location).toBe('/')
    expect((await back('https://evil.com/', '/save-or-contacts')).headers.location).toBe('/contacts')
    await app.close()
  })

  it('does not send a failed form to another site either', async () => {
    const app = await boot(platform)
    const res = await inertia(request(app.getHttpServer()).post('/invalid')).set('Referer', 'https://evil.com/form')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/')
    await app.close()
  })

  it('trusts X-Forwarded-* only when the platform is told to', async () => {
    const forwarded = (test: request.Test) =>
      inertia(test)
        .set('Host', 'internal:8080')
        .set('X-Forwarded-Host', 'app.example.com')
        .set('X-Forwarded-Proto', 'https')
        .set('Referer', 'https://app.example.com/form')

    const untrusting = await boot(platform)
    expect((await forwarded(request(untrusting.getHttpServer()).post('/save'))).headers.location).toBe('/')
    await untrusting.close()

    const trusting = await boot(platform, {}, true)
    expect((await forwarded(request(trusting.getHttpServer()).post('/save'))).headers.location).toBe(
      'https://app.example.com/form',
    )
    await trusting.close()
  })

  it('uses the configured url as the only origin', async () => {
    const app = await boot(platform, { url: 'https://app.example.com' })
    const post = (referer: string) =>
      inertia(request(app.getHttpServer()).post('/save')).set('Host', 'internal:8080').set('Referer', referer)

    expect((await post('https://app.example.com/form')).headers.location).toBe('https://app.example.com/form')
    expect((await post('http://internal:8080/form')).headers.location).toBe('/')
    await app.close()
  })
})

describe('the url option', () => {
  it.each(['app.example.com', 'ftp://app.example.com', 'not a url'])('refuses %s at boot', async (url) => {
    const start = async () => {
      const moduleRef = await Test.createTestingModule({ imports: [MvcModule.forRoot({ url })] }).compile()
      await moduleRef.createNestApplication({ logger: false }).init()
    }
    await expect(start()).rejects.toThrow(/absolute http\(s\) URL/)
  })
})
