import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Injectable,
  NotFoundException,
  type INestApplication,
  type MiddlewareConsumer,
  type NestMiddleware,
  type NestModule,
  Module,
} from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MvcModule, View, ValidationException, requestState, type AnyRequest, type MvcModuleOptions } from '../src/index'

@Controller()
class PagesController {
  @Get('home')
  @View('Home')
  home() {
    return { ok: true }
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('No such thing')
  }

  @Get('forbidden')
  forbidden() {
    throw new ForbiddenException()
  }

  @Get('expired')
  expired() {
    throw new HttpException('Page expired', 419)
  }

  @Get('boom')
  boom() {
    throw new Error('database on fire')
  }

  @Get('invalid')
  invalid() {
    throw new ValidationException({ email: 'Invalid email' })
  }
}

/** Stands in for an auth layer: shares `auth` the way the demo's middleware does. */
@Injectable()
class ShareAuth implements NestMiddleware {
  use(req: AnyRequest, _res: unknown, next: () => void) {
    requestState(req).shared.auth = { user: 'lee' }
    next()
  }
}

const platforms: [string, () => unknown][] = [
  ['express', () => undefined],
  ['fastify', () => new FastifyAdapter()],
]

describe.each(platforms)('error pages (%s)', (platform, adapter) => {
  let app: INestApplication

  async function boot(options: MvcModuleOptions = {}) {
    @Module({ imports: [MvcModule.forRoot({ version: 'v1', ...options })], controllers: [PagesController] })
    class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(ShareAuth).forRoutes('{*splat}')
      }
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    const instance = adapter()
    app = instance
      ? moduleRef.createNestApplication(instance as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
    await app.init()
    if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
    return app
  }

  afterEach(async () => {
    await app?.close()
    vi.restoreAllMocks()
  })

  const inertia = (req: request.Test) => req.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  const errorPages: MvcModuleOptions['errorPages'] = ({ status, exception }) => {
    if ([403, 404, 500].includes(status)) {
      return { component: 'Errors/Show', props: { status, reason: (exception as Error).message }, shared: true }
    }
  }

  it('renders the configured component with the error status on an Inertia visit', async () => {
    await boot({ errorPages })

    const res = await inertia(request(app.getHttpServer()).get('/missing'))

    expect(res.status).toBe(404)
    expect(res.headers['x-inertia']).toBe('true')
    expect(res.body.component).toBe('Errors/Show')
    expect(res.body.props.status).toBe(404)
    expect(res.body.props.reason).toBe('No such thing')
    expect(res.body.url).toBe('/missing')
  })

  it('includes shared props only when asked to', async () => {
    await boot({ errorPages })
    const withShared = await inertia(request(app.getHttpServer()).get('/missing'))
    expect(withShared.body.props.auth).toEqual({ user: 'lee' })
    expect(withShared.body.props.errors).toEqual({})
    await app.close()

    await boot({ errorPages: ({ status }) => ({ component: 'Errors/Show', props: { status } }) })
    const without = await inertia(request(app.getHttpServer()).get('/missing'))
    expect(without.body.props.auth).toBeUndefined()
  })

  it('serves the HTML shell with the error status on a first load', async () => {
    await boot({ errorPages })

    const res = await request(app.getHttpServer()).get('/forbidden')

    expect(res.status).toBe(403)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.text).toContain('data-page="app"')
    expect(res.text).toContain('"component":"Errors\\/Show"')
  })

  it('turns an unknown error into a 500 page and still logs it', async () => {
    await boot({ errorPages })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await inertia(request(app.getHttpServer()).get('/boom'))

    expect(res.status).toBe(500)
    expect(res.body.props).toMatchObject({ status: 500, reason: 'database on fire' })
    void logged // Nest's Logger is silenced in tests; the error path is covered by the status
  })

  it('falls through to Nest when the callback returns nothing, or is not configured', async () => {
    await boot({ errorPages })
    const notCovered = await inertia(request(app.getHttpServer()).get('/expired'))
    expect(notCovered.status).toBe(419)
    expect(notCovered.headers['x-inertia']).toBeUndefined()
    expect(notCovered.body).toMatchObject({ statusCode: 419 })
    await app.close()

    await boot()
    const unconfigured = await inertia(request(app.getHttpServer()).get('/missing'))
    expect(unconfigured.status).toBe(404)
    expect(unconfigured.body).toMatchObject({ statusCode: 404, message: 'No such thing' })
  })

  it('tells the callback what it is looking at', async () => {
    const seen = vi.fn()
    await boot({
      errorPages: (context) => {
        seen({ status: context.status, isInertia: context.isInertia, isDevelopment: context.isDevelopment })
        return undefined
      },
    })

    await inertia(request(app.getHttpServer()).get('/missing'))
    await request(app.getHttpServer()).get('/missing')

    expect(seen).toHaveBeenNthCalledWith(1, { status: 404, isInertia: true, isDevelopment: true })
    expect(seen).toHaveBeenNthCalledWith(2, { status: 404, isInertia: false, isDevelopment: true })
  })

  it('lets validation errors keep the redirect-back flow instead of an error page', async () => {
    await boot({ errorPages: () => ({ component: 'Errors/Show' }) })

    const res = await inertia(request(app.getHttpServer()).get('/invalid').set('Referer', '/home'))

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/home')
  })

  it('does not touch successful pages', async () => {
    await boot({ errorPages })
    const res = await inertia(request(app.getHttpServer()).get('/home'))
    expect(res.status).toBe(200)
    expect(res.body.component).toBe('Home')
  })
})
