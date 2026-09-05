import { Body, Controller, Get, Inject, Post, Put, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CookieFlashStore,
  MvcModule,
  SessionFlashStore,
  ValidationException,
  View,
  ViewService,
  mergeBags,
  once,
  serializeCookie,
  writeCookie,
  type FlashBag,
  type MvcModuleOptions,
} from '../src/index'

// ── units ─────────────────────────────────────────────────────────────────────

describe('cookie helpers', () => {
  it('serializes a safe-by-default cookie', () => {
    expect(serializeCookie('mvc_flash', '{"a":1}', { maxAge: 300 })).toBe(
      'mvc_flash=%7B%22a%22%3A1%7D; Path=/; Max-Age=300; HttpOnly; SameSite=Lax',
    )
    expect(serializeCookie('x', '', { maxAge: 0 })).toContain('Expires=Thu, 01 Jan 1970')
  })

  it('replaces its own Set-Cookie entry and leaves other cookies alone', () => {
    const headers: Record<string, string | string[]> = { 'Set-Cookie': ['sid=abc; Path=/', 'mvc_flash=old; Path=/'] }
    const res = {
      getHeader: (name: string) => headers[name],
      setHeader: (name: string, value: string | string[]) => void (headers[name] = value),
    }

    writeCookie(res, 'mvc_flash', 'new')

    expect(headers['Set-Cookie']).toHaveLength(2)
    expect(headers['Set-Cookie'][0]).toBe('sid=abc; Path=/')
    expect(headers['Set-Cookie'][1]).toMatch(/^mvc_flash=new; /)
  })

  it('uses Fastify’s header() when there is no setHeader', () => {
    const header = vi.fn()
    writeCookie({ header, getHeader: () => undefined }, 'mvc_flash', 'v')
    expect(header).toHaveBeenCalledWith('Set-Cookie', [expect.stringMatching(/^mvc_flash=v; /)])
  })
})

describe('flash stores', () => {
  it('CookieFlashStore round-trips a bag through the Cookie header and clears it', () => {
    const store = new CookieFlashStore({ maxAge: 60 })
    const headers: Record<string, string | string[]> = {}
    const res = {
      getHeader: (name: string) => headers[name],
      setHeader: (name: string, value: string | string[]) => void (headers[name] = value),
    }
    const bag: FlashBag = { flash: { message: 'Saved' }, refresh: ['organizations'] }

    store.write({ headers: {} }, res, bag)
    const cookie = (headers['Set-Cookie'] as string[])[0]
    expect(cookie).toContain('Max-Age=60')

    const req = { headers: { cookie: cookie.split(';')[0] } }
    expect(store.read(req)).toEqual(bag)

    store.clear(req, res)
    expect((headers['Set-Cookie'] as string[])[0]).toContain('Max-Age=0')
    expect(store.read({ headers: { cookie: 'mvc_flash=not-json' } })).toBeUndefined()
  })

  it('SessionFlashStore keeps the bag in the session and explains a missing session', () => {
    const store = new SessionFlashStore()
    const session: Record<string, unknown> = {}
    const req = { headers: {}, session }

    store.write(req, {}, { flash: { message: 'Saved' } })
    expect(session.mvcFlash).toEqual({ flash: { message: 'Saved' } })
    expect(store.read(req)).toEqual({ flash: { message: 'Saved' } })
    store.clear(req)
    expect(session.mvcFlash).toBeUndefined()

    expect(() => store.read({ headers: {} })).toThrow(/needs a session/)
  })

  it('mergeBags merges flash, replaces errors and unions refresh keys', () => {
    expect(
      mergeBags({ flash: { a: 1 }, errors: { x: 'old' }, refresh: ['k1'] }, undefined, {
        flash: { b: 2 },
        errors: { y: 'new' },
        refresh: ['k1', 'k2'],
      }),
    ).toEqual({ flash: { a: 1, b: 2 }, errors: { y: 'new' }, refresh: ['k1', 'k2'] })
  })
})

// ── the wire, on both platforms ──────────────────────────────────────────────

const resolved = vi.fn(() => ['Acme'])

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('contacts/create')
  @View('Contacts/Create')
  create() {
    return { organizations: once(resolved, { as: 'organizations' }) }
  }

  @Post('organizations')
  store(@Body() body: { name?: string }) {
    if (!body.name) throw new ValidationException({ name: 'Name is required.' })
    this.view.flash('message', `Created ${body.name}`).refresh('organizations')
    return this.view.back()
  }

  @Put('organizations/1')
  update() {
    this.view.flash({ message: 'Updated' })
    return this.view.redirect('/contacts/create')
  }

  @Get('flash-now')
  @View('FlashNow')
  flashNow() {
    this.view.flash('message', 'Right away')
    return {}
  }

  @Get('external')
  external() {
    return this.view.location('https://example.com/oauth')
  }
}

const platforms: [string, () => INestApplication | undefined][] = [
  ['express', () => undefined],
  ['fastify', () => new FastifyAdapter() as unknown as INestApplication],
]

describe.each(platforms)('flash on the wire (%s)', (platform, adapter) => {
  let app: INestApplication

  async function boot(options: MvcModuleOptions = {}) {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', ...options })],
      controllers: [PagesController],
    }).compile()
    const instance = adapter()
    app = instance ? moduleRef.createNestApplication(instance as never, { logger: false }) : moduleRef.createNestApplication({ logger: false })
    await app.init()
    if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
    return app
  }

  beforeAll(async () => {
    await boot()
  })

  afterAll(async () => {
    await app.close()
  })

  const inertia = (req: request.Test) => req.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
  const flashCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mvc_flash='))?.split(';')[0]

  it('carries flash data across the redirect and shows it exactly once', async () => {
    const post = await inertia(request(app.getHttpServer()).post('/organizations').set('Referer', '/contacts/create'))
      .send({ name: 'Acme' })

    expect(post.status).toBe(302)
    expect(post.headers.location).toBe('/contacts/create')
    const cookie = flashCookie(post)
    expect(cookie).toBeDefined()

    const next = await inertia(request(app.getHttpServer()).get('/contacts/create')).set('Cookie', cookie!)
    expect(next.body.flash).toEqual({ message: 'Created Acme' })
    expect(flashCookie(next)).toBe('mvc_flash=')

    const after = await inertia(request(app.getHttpServer()).get('/contacts/create'))
    expect(after.body.flash).toBeUndefined()
  })

  it('re-resolves a once prop the mutation marked for refresh, even though the client holds it', async () => {
    resolved.mockClear()
    const post = await inertia(request(app.getHttpServer()).post('/organizations')).send({ name: 'Acme' })
    const cookie = flashCookie(post)!

    const held = await inertia(request(app.getHttpServer()).get('/contacts/create')).set(
      'X-Inertia-Except-Once-Props',
      'organizations',
    )
    expect(held.body.props.organizations).toBeUndefined()

    const refreshed = await inertia(request(app.getHttpServer()).get('/contacts/create'))
      .set('X-Inertia-Except-Once-Props', 'organizations')
      .set('Cookie', cookie)
    expect(refreshed.body.props.organizations).toEqual(['Acme'])
    expect(resolved).toHaveBeenCalledOnce()
  })

  it('survives a 409 version mismatch in between', async () => {
    const post = await inertia(request(app.getHttpServer()).post('/organizations')).send({ name: 'Acme' })
    const cookie = flashCookie(post)!

    const stale = await request(app.getHttpServer())
      .get('/contacts/create')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'stale')
      .set('Cookie', cookie)
    expect(stale.status).toBe(409)
    expect(stale.headers['x-inertia-location']).toContain('/contacts/create')
    expect(flashCookie(stale)).toBeUndefined() // untouched, so still valid in the browser

    const full = await request(app.getHttpServer()).get('/contacts/create').set('Cookie', cookie)
    expect(full.text).toContain('"flash":{"message":"Created Acme"}')
  })

  it('shows data flashed during a request on that same render', async () => {
    const res = await inertia(request(app.getHttpServer()).get('/flash-now'))
    expect(res.body.flash).toEqual({ message: 'Right away' })
    expect(flashCookie(res)).toBe('mvc_flash=')
  })

  it('answers redirect() after PUT with 303, as the protocol requires', async () => {
    const res = await inertia(request(app.getHttpServer()).put('/organizations/1'))
    expect(res.status).toBe(303)
    expect(res.headers.location).toBe('/contacts/create')
    expect(flashCookie(res)).toContain('Updated')
  })

  it('answers location() with 409 + X-Inertia-Location on Inertia visits and a redirect otherwise', async () => {
    const visit = await inertia(request(app.getHttpServer()).get('/external'))
    expect(visit.status).toBe(409)
    expect(visit.headers['x-inertia-location']).toBe('https://example.com/oauth')

    const plain = await request(app.getHttpServer()).get('/external')
    expect(plain.status).toBe(302)
    expect(plain.headers.location).toBe('https://example.com/oauth')
  })

  it('runs the validation-errors flow through the same bag', async () => {
    const post = await inertia(request(app.getHttpServer()).post('/organizations').set('Referer', '/contacts/create'))
      .send({})
    expect(post.status).toBe(302)
    const cookie = flashCookie(post)!

    const back = await inertia(request(app.getHttpServer()).get('/contacts/create')).set('Cookie', cookie)
    expect(back.body.props.errors).toEqual({ name: 'Name is required.' })
    expect(back.body.flash).toBeUndefined()
  })

  it('renders the JSON page object and the HTML shell', async () => {
    const json = await inertia(request(app.getHttpServer()).get('/contacts/create'))
    expect(json.headers['x-inertia']).toBe('true')
    expect(json.body.component).toBe('Contacts/Create')
    expect(json.body.url).toBe('/contacts/create')

    const html = await request(app.getHttpServer()).get('/contacts/create')
    expect(html.headers['content-type']).toContain('text/html')
    expect(html.text).toContain('data-page="app"')
  })
})

describe('flash with a session store', () => {
  it('keeps the bag out of the cookie when SessionFlashStore is bound', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', flash: { store: SessionFlashStore } })],
      controllers: [PagesController],
    }).compile()
    const app = moduleRef.createNestApplication({ logger: false })
    // Stand-in for express-session: one session object for the whole test.
    const session: Record<string, unknown> = {}
    app.use((req: { session?: unknown }, _res: unknown, next: () => void) => {
      req.session = session
      next()
    })
    await app.init()

    const post = await request(app.getHttpServer())
      .post('/organizations')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .send({ name: 'Acme' })
    expect(post.headers['set-cookie']).toBeUndefined()
    expect(session.mvcFlash).toEqual({ flash: { message: 'Created Acme' }, refresh: ['organizations'] })

    const next = await request(app.getHttpServer())
      .get('/contacts/create')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
    expect(next.body.flash).toEqual({ message: 'Created Acme' })
    expect(session.mvcFlash).toBeUndefined()

    await app.close()
  })
})
