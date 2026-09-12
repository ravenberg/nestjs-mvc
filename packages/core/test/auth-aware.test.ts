import {
  type CanActivate,
  Controller,
  type ExecutionContext,
  Get,
  Inject,
  Injectable,
  Logger,
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  Post,
  Put,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  type INestApplication,
} from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { AuthGuard, PassportStrategy } from '@nestjs/passport'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { Strategy } from 'passport-custom'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IDENTITY_COOKIE,
  INTENDED_COOKIE,
  KeyRing,
  identityInVersion,
  versionFor,
  MvcModule,
  View,
  ViewService,
  requestState,
  type AnyRequest,
  type MvcModuleOptions,
} from '../src/index'

// ── a small app with the NestJS docs' auth recipe ────────────────────────────

interface User {
  id: number
  name: string
  email: string
  passwordHash: string
}
const USERS: Record<string, User> = {
  '1': { id: 1, name: 'Ada', email: 'ada@example.com', passwordHash: 'scrypt$ada-secret' },
  '2': { id: 2, name: 'Bob', email: 'bob@example.com', passwordHash: 'scrypt$bob-secret' },
}
const bearer = (req: AnyRequest) => USERS[(req.headers.authorization ?? '').replace(/^Bearer /, '')]

const IS_PUBLIC = 'isPublic'
const Public = () => SetMetadata(IS_PUBLIC, true)

/** The docs' guard, resolving the user on every request and rejecting only where the route is not public. */
@Injectable()
class DocsAuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AnyRequest & { user?: User }>()
    req.user = bearer(req)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])
    if (!isPublic && !req.user) throw new UnauthorizedException()
    return true
  }
}

/** The same check, as a Passport strategy behind `AuthGuard('token')`. */
@Injectable()
class TokenStrategy extends PassportStrategy(Strategy, 'token') {
  validate(req: AnyRequest): User | null {
    return bearer(req) ?? null
  }
}

const handled = vi.fn()
const noted = vi.fn()

@Controller()
class AppController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('login') @Public() @View('Auth/Login')
  loginPage() {
    return {}
  }

  @Post('login') @Public()
  login() {
    return this.view.intended('/dashboard')
  }

  @Get('dashboard') @View('Dashboard')
  dashboard() {
    handled()
    return { stats: [1, 2, 3] }
  }

  @Get('welcome') @Public() @View('Welcome')
  welcome() {
    return {}
  }

  @Post('notes')
  addNote() {
    noted()
    return this.view.back()
  }

  @Put('notes')
  updateNote() {
    return this.view.back()
  }

  @Get('api/me')
  me() {
    return { ok: true }
  }

  @Get('passport') @Public() @UseGuards(AuthGuard('token')) @View('Passport')
  passport() {
    return {}
  }
}

/** Shares an `auth` object of the app's own, the way the kitchen sink shares notifications. */
@Injectable()
class ShareNotifications implements NestMiddleware {
  use(req: AnyRequest, _res: unknown, next: () => void) {
    requestState(req).shared.auth = { notifications: ['hello'] }
    next()
  }
}

type Platform = 'express' | 'fastify'
const HOST = 'app.test'
const KEY = 'auth-aware-test-key-'.padEnd(43, 'a')
const keys = new KeyRing([KEY])
const share: NonNullable<MvcModuleOptions['auth']>['share'] = (user) => ({ id: (user as User).id, name: (user as User).name })

async function boot(platform: Platform, options: MvcModuleOptions = {}, extra: { notifications?: boolean } = {}) {
  @Module({})
  class Notifications implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      if (extra.notifications) consumer.apply(ShareNotifications).forRoutes('{*splat}')
    }
  }
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], auth: { share }, ...options }), Notifications],
    controllers: [AppController],
    providers: [{ provide: APP_GUARD, useClass: DocsAuthGuard }, TokenStrategy, ShareNotifications],
  }).compile()
  const app =
    platform === 'fastify'
      ? moduleRef.createNestApplication(new FastifyAdapter() as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
  await app.init()
  if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  return app
}

const cookies = (res: request.Response): string[] => (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
const cookieLine = (res: request.Response, name: string) => cookies(res).find((c) => c.startsWith(`${name}=`))
const cookieValue = (res: request.Response, name: string) => {
  const line = cookieLine(res, name)
  return line === undefined ? undefined : decodeURIComponent(line.split(';')[0].slice(name.length + 1))
}
const identityOf = (id: string) => keys.digest('identity', id)

describe.each<Platform>(['express', 'fastify'])('auth-aware (%s)', (platform) => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
    handled.mockClear()
    noted.mockClear()
  })

  const server = () => request(app.getHttpServer())
  const page = (test: request.Test) => test.set('Host', HOST).set('Accept', 'text/html,application/xhtml+xml')
  const visit = (test: request.Test) => test.set('Host', HOST).set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
  /**
   * Logged in as `id` (if any), from a page rendered for `seen` (default: the
   * same user; `null`: a guest's page and a browser that has not seen anyone).
   * The page's version names who it was rendered for; the cookie is the
   * browser's memory, for page loads that carry no version.
   */
  const asUser = (test: request.Test, id: string | undefined, seen: string | null | undefined = id) => {
    if (id) test.set('Authorization', `Bearer ${id}`)
    test.set('X-Inertia-Version', seen ? `v1#${identityOf(seen)}` : 'v1')
    if (seen) test.set('Cookie', `${IDENTITY_COOKIE}=${identityOf(seen)}`)
    return test
  }

  // ── a. a 401 goes to the login page ─────────────────────────────────────────

  describe('a 401', () => {
    it('sends a page load and an Inertia visit to the login page, remembering the page', async () => {
      app = await boot(platform)
      const load = await page(server().get('/dashboard?tab=2'))
      expect(load.status).toBe(302)
      expect(load.headers.location).toBe('/login')
      expect(keys.verify('intended', cookieValue(load, INTENDED_COOKIE)!)).toBe('/dashboard?tab=2')
      expect(cookieLine(load, INTENDED_COOKIE)).toMatch(/Max-Age=3600; HttpOnly; SameSite=Lax$/)

      const inertia = await visit(server().get('/dashboard'))
      expect(inertia.status).toBe(302)
      expect(inertia.headers.location).toBe('/login')
      expect(handled).not.toHaveBeenCalled()
    })

    it('answers 303 after PUT and remembers the page the form was on', async () => {
      app = await boot(platform)
      const put = await visit(server().put('/notes')).set('Referer', `http://${HOST}/dashboard`)
      expect(put.status).toBe(303)
      expect(keys.verify('intended', cookieValue(put, INTENDED_COOKIE)!)).toBe(`http://${HOST}/dashboard`)

      const foreign = await visit(server().post('/notes')).set('Referer', 'https://evil.example/')
      expect(foreign.status).toBe(302)
      expect(cookieLine(foreign, INTENDED_COOKIE)).toBeUndefined()
    })

    it('keeps the 401 for JSON clients, XHR and Precognition', async () => {
      app = await boot(platform)
      expect((await server().get('/api/me').set('Accept', 'application/json')).status).toBe(401)
      expect((await server().get('/api/me')).status).toBe(401)
      expect((await page(server().get('/api/me')).set('X-Requested-With', 'XMLHttpRequest')).status).toBe(401)
      expect((await visit(server().post('/notes')).set('Precognition', 'true')).status).toBe(401)
    })

    it('remembers nothing for a prefetch, so hovering a link cannot overwrite it', async () => {
      app = await boot(platform)
      const prefetch = await visit(server().get('/dashboard')).set('Purpose', 'prefetch')
      expect(prefetch.headers.location).toBe('/login')
      expect(cookieLine(prefetch, INTENDED_COOKIE)).toBeUndefined()
    })

    it('never sends the login page to itself, and keeps the 401 with loginUrl: false', async () => {
      app = await boot(platform, { auth: { share, loginUrl: '/dashboard' } })
      expect((await page(server().get('/dashboard'))).status).toBe(401)
      await app.close()

      app = await boot(platform, { auth: { loginUrl: false } })
      expect((await page(server().get('/dashboard'))).status).toBe(401)
    })

    it('sends an Inertia visit to a hosted login page as a full page visit', async () => {
      app = await boot(platform, { auth: { loginUrl: 'https://id.example.com/login' } })
      const inertia = await visit(server().get('/dashboard'))
      expect(inertia.status).toBe(409)
      expect(inertia.headers['x-inertia-location']).toBe('https://id.example.com/login')
      expect((await page(server().get('/dashboard'))).headers.location).toBe('https://id.example.com/login')
    })

    it('works the same behind Passport’s AuthGuard', async () => {
      app = await boot(platform)
      const res = await visit(server().get('/passport'))
      expect(res.status).toBe(302)
      expect(res.headers.location).toBe('/login')
      expect((await asUser(visit(server().get('/passport')), '1')).status).toBe(200)
    })
  })

  // ── intended() ──────────────────────────────────────────────────────────────

  describe('intended()', () => {
    const login = (cookie?: string) => {
      const test = visit(server().post('/login'))
      return cookie === undefined ? test : test.set('Cookie', `${INTENDED_COOKIE}=${encodeURIComponent(cookie)}`)
    }

    it('goes where the visitor was going, and forgets it', async () => {
      app = await boot(platform)
      const res = await login(keys.sign('intended', '/dashboard?tab=2'))
      expect(res.headers.location).toBe('/dashboard?tab=2')
      expect(cookieLine(res, INTENDED_COOKIE)).toMatch(/Max-Age=0/)
    })

    it('falls back when there is nothing, or nothing it can trust', async () => {
      app = await boot(platform)
      expect((await login()).headers.location).toBe('/dashboard')
      expect((await login('/admin')).headers.location).toBe('/dashboard') // unsigned
      expect((await login(new KeyRing(['x'.repeat(40)]).sign('intended', '/admin'))).headers.location).toBe('/dashboard')
      expect((await login(keys.sign('intended', '//evil.example/'))).headers.location).toBe('/dashboard') // signed, still unsafe
    })
  })

  // ── c. auth.user on every page ─────────────────────────────────────────────

  describe('auth.share', () => {
    it('shares only what share() returns, after the guards ran', async () => {
      app = await boot(platform)
      const res = await asUser(visit(server().get('/dashboard')), '1')
      expect(res.body.props.auth).toEqual({ user: { id: 1, name: 'Ada' } })
      expect(res.body.sharedProps).toContain('auth')
      expect(JSON.stringify(res.body)).not.toContain('secret')
      expect(JSON.stringify(res.body)).not.toContain('ada@example.com')

      const html = await page(server().get('/dashboard')).set('Authorization', 'Bearer 1')
      expect(html.text).toContain('"auth":{"user":{"id":1,"name":"Ada"}}')
      expect(html.text).not.toContain('secret')
    })

    it('shares null when nobody is logged in, and a Passport user like any other', async () => {
      app = await boot(platform)
      expect((await visit(server().get('/welcome'))).body.props.auth).toEqual({ user: null })
      expect((await asUser(visit(server().get('/passport')), '2')).body.props.auth).toEqual({
        user: { id: 2, name: 'Bob' },
      })
    })

    it('merges into an auth object the app shares itself', async () => {
      app = await boot(platform, {}, { notifications: true })
      const res = await asUser(visit(server().get('/dashboard')), '1')
      expect(res.body.props.auth).toEqual({ notifications: ['hello'], user: { id: 1, name: 'Ada' } })
    })

    it('reads the user from wherever auth.user says', async () => {
      app = await boot(platform, {
        auth: { share, user: (req) => (req.headers['x-account'] === '2' ? USERS['2'] : undefined) },
      })
      expect((await asUser(visit(server().get('/welcome')), undefined, '2').set('X-Account', '2')).body.props.auth).toEqual({
        user: { id: 2, name: 'Bob' },
      })
    })

    it('shares nothing without share()', async () => {
      app = await boot(platform, { auth: {} })
      const res = await asUser(visit(server().get('/dashboard')), '1')
      expect(res.body.props.auth).toBeUndefined()
      expect(JSON.stringify(res.body)).not.toContain('Ada')
    })
  })

  // ── d. the identity reset ──────────────────────────────────────────────────

  describe('the identity reset', () => {
    it('names the user in the page version, as a digest; a guest page has the asset version alone', async () => {
      app = await boot(platform)
      expect((await asUser(visit(server().get('/dashboard')), '1')).body.version).toBe(`v1#${identityOf('1')}`)
      expect((await asUser(visit(server().get('/welcome')), undefined)).body.version).toBe('v1')
      expect(identityOf('1')).not.toContain('1')
    })

    it('answers an Inertia visit after a switch of user with a full page load, before the handler runs', async () => {
      app = await boot(platform)
      const switched = await asUser(visit(server().get('/dashboard?tab=2')), '2', '1')
      expect(switched.status).toBe(409)
      expect(switched.headers['x-inertia-location']).toBe('/dashboard?tab=2')
      // The page's next version, so a background request leaves the reload to the next visit.
      expect(switched.headers['x-inertia-version']).toBe(`v1#${identityOf('2')}`)
      expect(handled).not.toHaveBeenCalled()

      // The full page load that follows clears history (it rode the flash bag).
      const load = await asUser(page(server().get('/dashboard?tab=2')), '2', '2').set(
        'Cookie',
        `${cookieLine(switched, 'mvc_flash')!.split(';')[0]}; ${IDENTITY_COOKIE}=${identityOf('2')}`,
      )
      expect(load.text).toContain('"clearHistory":true')
    })

    it('catches a switch made in another tab, which the shared cookie cannot see', async () => {
      app = await boot(platform)
      // The other tab already showed user 2 a page, so the cookie says user 2;
      // this tab's page was rendered for user 1.
      const stale = await asUser(visit(server().get('/dashboard')), '2', '1').set('Cookie', `${IDENTITY_COOKIE}=${identityOf('2')}`)
      expect(stale.status).toBe(409)
    })

    it('does not carry out a mutation from a page rendered for someone else; it goes back to that page', async () => {
      app = await boot(platform)
      const post = await asUser(visit(server().post('/notes')), '2', '1').set('Referer', `http://${HOST}/dashboard`)
      expect(post.status).toBe(409)
      expect(post.headers['x-inertia-location']).toBe(`http://${HOST}/dashboard`)
      expect(noted).not.toHaveBeenCalled()

      expect((await asUser(visit(server().post('/notes')), '2')).status).toBe(302)
      expect(noted).toHaveBeenCalledOnce()
    })

    it('resets after a logout, and forgets the identity on the page load that follows', async () => {
      app = await boot(platform)
      expect((await asUser(visit(server().get('/welcome')), undefined, '1')).status).toBe(409)

      const load = await asUser(page(server().get('/welcome')), undefined, '1')
      expect(load.text).toContain('"clearHistory":true')
      expect(cookieLine(load, IDENTITY_COOKIE)).toMatch(/^mvc_identity=; .*Max-Age=0/)
    })

    it('answers a prefetch from a stale page the same way (the client acts on it only when the link is clicked)', async () => {
      app = await boot(platform)
      const prefetch = await asUser(visit(server().get('/dashboard')), '2', '1').set('Purpose', 'prefetch')
      expect(prefetch.status).toBe(409)
      expect(cookieLine(prefetch, IDENTITY_COOKIE)).toBeUndefined()
    })

    it('leaves Precognition alone: a validate-only request changes nothing', async () => {
      app = await boot(platform)
      expect((await asUser(visit(server().post('/notes')), '2', '1').set('Precognition', 'true')).status).toBe(204)
    })

    it('keeps the asset check apart: a page from before a deploy is stale whoever it was for', async () => {
      app = await boot(platform)
      const oldAssets = await asUser(visit(server().get('/dashboard')), '1').set('X-Inertia-Version', `v0#${identityOf('1')}`)
      expect(oldAssets.status).toBe(409)
      expect(oldAssets.headers['x-inertia-version']).toBe('v1')
    })

    it('clears history on a full-page login the browser had not seen, and records the user', async () => {
      app = await boot(platform)
      const first = await asUser(page(server().get('/dashboard')), '1', null)
      expect(first.status).toBe(200)
      expect(first.text).toContain('"clearHistory":true')
      expect(cookieValue(first, IDENTITY_COOKIE)).toBe(identityOf('1'))
      expect(cookieLine(first, IDENTITY_COOKIE)).toMatch(/HttpOnly; SameSite=Lax$/)

      const again = await asUser(page(server().get('/dashboard')), '1')
      expect(again.text).not.toContain('"clearHistory":true')
      expect(cookieLine(again, IDENTITY_COOKIE)).toBeUndefined()
    })

    it('gives an app without logins no cookie and a plain version', async () => {
      app = await boot(platform)
      const res = await page(server().get('/welcome'))
      expect(cookieLine(res, IDENTITY_COOKIE)).toBeUndefined()
      expect(res.text).not.toContain('"clearHistory":true')
      expect(res.text).toContain('"version":"v1"')
    })

    it('cannot tell users without an id apart, until auth.id says how', async () => {
      const noId = { name: 'Anon' }
      const fromUserOne = (test: request.Test) => test.set('X-Inertia-Version', `v1#${identityOf('1')}`)
      app = await boot(platform, { auth: { share, user: () => noId } })
      expect((await fromUserOne(visit(server().get('/welcome')))).status).toBe(200)
      await app.close()

      app = await boot(platform, { auth: { share, user: () => noId, id: (user) => (user as { name: string }).name } })
      expect((await fromUserOne(visit(server().get('/welcome')))).status).toBe(409)
    })
  })
})

describe('the page version', () => {
  it('adds who the page was for to the asset version, and reads it back', () => {
    expect(versionFor('v1', 'abc')).toBe('v1#abc')
    expect(versionFor('v1', null)).toBe('v1')
    expect(versionFor(null, 'abc')).toBe('#abc')
    expect(versionFor(null, undefined)).toBeNull()

    expect(identityInVersion('v1#abc', 'v1')).toBe('abc')
    expect(identityInVersion('v1', 'v1')).toBeNull()
    expect(identityInVersion(undefined, null)).toBeNull()
    expect(identityInVersion('#abc', null)).toBe('abc')
    expect(identityInVersion('v0#abc', 'v1')).toBeUndefined()
    expect(identityInVersion('v1x', 'v1')).toBeUndefined()
  })

  it('is not fooled by a # in the asset version itself', () => {
    expect(identityInVersion('build#7', 'build#7')).toBeNull()
    expect(identityInVersion('build#7#abc', 'build#7')).toBe('abc')
  })
})

describe('development hints', () => {
  const env = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = env
    vi.restoreAllMocks()
  })

  it('says once that request.user is not shared, and once that it has no id', async () => {
    process.env.NODE_ENV = 'development'
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    let app = await boot('express', { auth: {} })
    for (let i = 0; i < 3; i++) await request(app.getHttpServer()).get('/dashboard').set('Authorization', 'Bearer 1')
    expect(warn.mock.calls.filter(([message]) => String(message).includes('not shared'))).toHaveLength(1)
    await app.close()

    app = await boot('express', { auth: { share, user: () => ({ name: 'Anon' }) } })
    for (let i = 0; i < 3; i++) await request(app.getHttpServer()).get('/welcome')
    expect(warn.mock.calls.filter(([message]) => String(message).includes('has no id'))).toHaveLength(1)
    await app.close()
  })
})
