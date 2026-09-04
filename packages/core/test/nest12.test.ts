import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  OnApplicationBootstrap,
  type INestApplication,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MVC_VITE_SERVER, MvcModule, type ViteDevServerHolder } from '../src/index'

/**
 * Guards the two NestJS v12 changes that are behavioural rather than API-level:
 * lifecycle hooks now run "by component hierarchy level", and HTTP adapter error
 * mapping was reworked. Neither surfaces as a type error, so they need assertions.
 */

/** Mirrors how MvcModule reaches the http.Server to attach Vite's HMR socket. */
@Injectable()
class BootstrapProbe implements OnApplicationBootstrap {
  serverAtBootstrap: unknown = null

  constructor(@Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost) {}

  onApplicationBootstrap(): void {
    this.serverAtBootstrap = this.adapterHost?.httpAdapter?.getHttpServer?.() ?? null
  }
}

@Module({ providers: [BootstrapProbe], exports: [BootstrapProbe] })
class ProbeModule {}

@Controller()
class ThrowingController {
  @Get('not-found')
  notFound() {
    throw new NotFoundException('no such thing')
  }

  @Get('teapot')
  teapot() {
    throw new HttpException({ message: 'nope', reason: 'teapot' }, HttpStatus.I_AM_A_TEAPOT)
  }

  @Get('boom')
  boom() {
    throw new Error('unhandled explosion')
  }
}

describe('NestJS v12 compatibility', () => {
  let app: INestApplication

  afterEach(async () => {
    await app?.close()
  })

  it('exposes the http server during onApplicationBootstrap', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' }), ProbeModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    // MvcModule attaches Vite's HMR websocket to this server, so losing it
    // would silently push HMR onto a second port.
    expect(moduleRef.get(BootstrapProbe).serverAtBootstrap).toBeTruthy()
  })

  it('leaves the vite holder empty when dev mode is off', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', vite: { entry: 'x.tsx', dev: false } })],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    expect(moduleRef.get<ViteDevServerHolder>(MVC_VITE_SERVER).server).toBeNull()
  })

  describe('exception mapping through the global View filter', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [MvcModule.forRoot({ version: 'v1' })],
        controllers: [ThrowingController],
      }).compile()
      // The unhandled-error case logs a stack trace by design; keep test output readable.
      app = moduleRef.createNestApplication({ logger: false })
      await app.init()
    })

    it('passes HttpExceptions it does not own through untouched', async () => {
      const notFound = await request(app.getHttpServer()).get('/not-found')
      expect(notFound.status).toBe(404)
      expect(notFound.body.message).toBe('no such thing')

      const teapot = await request(app.getHttpServer()).get('/teapot')
      expect(teapot.status).toBe(418)
      expect(teapot.body.reason).toBe('teapot')
    })

    it('still maps unhandled errors to a 500', async () => {
      const res = await request(app.getHttpServer()).get('/boom')
      expect(res.status).toBe(500)
    })

    it('does not hijack non-validation exceptions on Inertia visit', async () => {
      const res = await request(app.getHttpServer())
        .get('/not-found')
        .set('X-Inertia', 'true')
        .set('X-Inertia-Version', 'v1')
      expect(res.status).toBe(404)
      expect(res.headers.location).toBeUndefined()
    })
  })
})
