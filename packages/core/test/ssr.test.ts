import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Controller, Get, Inject, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MvcModule,
  Ssr,
  View,
  ViewService,
  decideSsr,
  ModuleSsrRenderer,
  ViteSsrRenderer,
  type MvcModuleOptions,
} from '../src/index'

describe('SSR decision', () => {
  it('is off unless a route opts in', () => {
    expect(decideSsr({})).toEqual({ render: false, reason: 'default' })
  })

  it('follows the decorator', () => {
    expect(decideSsr({ decorator: true })).toEqual({ render: true, reason: 'decorator' })
    expect(decideSsr({ decorator: false })).toEqual({ render: false, reason: 'decorator' })
  })

  it('lets a runtime call win over the decorator, in both directions', () => {
    expect(decideSsr({ decorator: true, runtime: false })).toEqual({ render: false, reason: 'runtime' })
    expect(decideSsr({ decorator: false, runtime: true })).toEqual({ render: true, reason: 'runtime' })
    expect(decideSsr({ runtime: true })).toEqual({ render: true, reason: 'runtime' })
  })
})

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  /** No decorator anywhere: the default, client-rendered. */
  @Get('public')
  @View('Public')
  public() {
    return { ok: true }
  }

  @Get('landing')
  @View('Landing')
  @Ssr()
  landing() {
    return { ok: true }
  }

  @Get('dashboard')
  @View('Dashboard')
  @Ssr(false)
  dashboard() {
    return { ok: true }
  }

  /** Opted in by the decorator, but a request-time check says no. */
  @Get('landing-for-members')
  @View('Landing')
  @Ssr()
  landingForMembers() {
    this.view.disableSsr()
    return { ok: true }
  }

  /** Not decorated, but opted in at request time. */
  @Get('public-forced')
  @View('Public')
  publicForced() {
    this.view.enableSsr()
    return { ok: true }
  }
}

/** `@Ssr()` on the controller covers every handler; one handler opts back out. */
@Controller('blog')
@Ssr()
class BlogController {
  @Get()
  @View('Blog/Index')
  index() {
    return { ok: true }
  }

  @Get('drafts')
  @View('Blog/Drafts')
  @Ssr(false)
  drafts() {
    return { ok: true }
  }
}

describe('SSR end to end', () => {
  let app: INestApplication

  const bundleDir = mkdtempSync(join(tmpdir(), 'mvc-ssr-'))
  const bundlePath = join(bundleDir, 'ssr.js')
  writeFileSync(
    bundlePath,
    "export default (page) => ({ head: ['<title>' + page.component + '</title>'], body: '<div id=\"app\">from-bundle</div>' })",
  )
  const SSR_URL = 'http://127.0.0.1:13714'

  afterEach(async () => {
    await app?.close()
    // The fetch stub is global; without this, call counts leak between tests.
    vi.restoreAllMocks()
  })

  /** Stands in for a standalone Inertia SSR server so no real process is needed. */
  function stubSsrServer(body = '<div id="app">rendered</div>') {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ head: ['<title>From SSR</title>'], body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  async function boot(ssr: MvcModuleOptions['ssr'], vite?: MvcModuleOptions['vite']) {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MvcModule.forRoot({
          version: 'v1',
          ssr,
          vite,
          template: (page, ctx) =>
            `<!DOCTYPE html><html><head>${ctx.head()}</head><body>${ctx.body()}</body></html>`,
        }),
      ],
      controllers: [PagesController, BlogController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
    return app
  }

  const isServerRendered = (html: string) => html.includes('from-bundle')
  const isClientRendered = (html: string) => html.includes('type="application/json"')

  describe('opting in', () => {
    it('injects the rendered head and body into the template for an @Ssr() route', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.text).toContain('<title>Landing</title>')
      expect(isServerRendered(res.text)).toBe(true)
      // SSR markup replaces the page-object script entirely.
      expect(isClientRendered(res.text)).toBe(false)
    })

    it('leaves undecorated routes client-rendered, even with a renderer configured', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/public')

      expect(isClientRendered(res.text)).toBe(true)
      expect(isServerRendered(res.text)).toBe(false)
    })

    it('respects @Ssr(false)', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/dashboard')
      expect(isClientRendered(res.text)).toBe(true)
    })

    it('applies @Ssr() on a controller to all of its handlers', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/blog')
      expect(isServerRendered(res.text)).toBe(true)
    })

    it('lets a handler opt out of a controller-level @Ssr()', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/blog/drafts')
      expect(isClientRendered(res.text)).toBe(true)
    })

    it('lets ViewService.disableSsr() override @Ssr() for one request', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/landing-for-members')
      expect(isClientRendered(res.text)).toBe(true)
    })

    it('lets ViewService.enableSsr() opt an undecorated route in', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/public-forced')
      expect(isServerRendered(res.text)).toBe(true)
    })

    it('never server-renders an Inertia visit', async () => {
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer())
        .get('/landing')
        .set('X-Inertia', 'true')
        .set('X-Inertia-Version', 'v1')

      expect(res.body.component).toBe('Landing')
    })
  })

  describe('transport selection', () => {
    it('loads a file entry root-relative and a generated (virtual) entry as-is through Vite', async () => {
      const seen: string[] = []
      const host = {
        ssrLoadModule: async (url: string) => {
          seen.push(url)
          return { default: () => ({ head: [], body: '<div id="app">dev</div>' }) }
        },
      }
      const page = { component: 'Home', props: {}, url: '/', version: 'v1' }

      await new ViteSsrRenderer(host, 'frontend/ssr.tsx').render(page)
      await new ViteSsrRenderer(host, 'virtual:nestjs-mvc/ssr').render(page)

      expect(seen).toEqual(['/frontend/ssr.tsx', 'virtual:nestjs-mvc/ssr'])
    })

    it('imports the built bundle in-process, without an SSR server', async () => {
      const renderer = new ModuleSsrRenderer(bundlePath)

      const result = await renderer.render({ component: 'Home', props: {}, url: '/', version: 'v1' })

      expect(result.body).toContain('from-bundle')
      expect(result.head).toEqual(['<title>Home</title>'])
    })

    it('resolves a relative bundle path against the given root', async () => {
      const renderer = new ModuleSsrRenderer('ssr.js', bundleDir)

      const result = await renderer.render({ component: 'Home', props: {}, url: '/', version: 'v1' })
      expect(result.body).toContain('from-bundle')
    })

    it('explains itself when the bundle is missing', async () => {
      const renderer = new ModuleSsrRenderer(join(bundleDir, 'nope.js'))

      await expect(
        renderer.render({ component: 'Home', props: {}, url: '/', version: 'v1' }),
      ).rejects.toThrow(/Could not load the SSR bundle/)
    })

    it('prefers the bundle over HTTP so the app stays one process', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      await boot({ bundle: bundlePath })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.text).toContain('from-bundle')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('uses a standalone SSR server only when url is set explicitly', async () => {
      const fetchSpy = stubSsrServer()
      await boot({ bundle: bundlePath, url: SSR_URL })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.text).toContain('rendered')
      expect(fetchSpy).toHaveBeenCalledOnce()
    })

    it('needs no ssr options at all: the bundle nestjsMvc() builds is found by convention', async () => {
      const root = mkdtempSync(join(tmpdir(), 'mvc-zero-config-'))
      mkdirSync(join(root, 'dist/ssr'), { recursive: true })
      writeFileSync(join(root, 'dist/ssr/ssr.js'), "export default () => ({ head: [], body: '<div id=\"app\">by-convention</div>' })")
      await boot(undefined, { root, dev: false })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.text).toContain('by-convention')
    })

    it('tells you to build when a route opts in and the default bundle is missing', async () => {
      const onError = vi.fn()
      await boot({ onError })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.status).toBe(200)
      expect(res.text).toContain('type="application/json"')
      expect(onError.mock.calls[0][0].message).toMatch(/Could not load the SSR bundle at .*dist\/ssr\/ssr\.js/)
    })
  })

  describe('failure handling', () => {
    it('falls back to client rendering when the SSR server is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
      const onError = vi.fn()
      await boot({ url: SSR_URL, onError })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.status).toBe(200)
      expect(res.text).toContain('type="application/json"')
      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0][0]).toMatchObject({ type: 'connection' })
    })

    it('reports a classified render failure and still serves the page', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'window is not defined', type: 'browser-api', component: 'Public' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      const onError = vi.fn()
      await boot({ url: SSR_URL, onError })

      const res = await request(app.getHttpServer()).get('/landing')

      expect(res.status).toBe(200)
      expect(onError.mock.calls[0][0]).toMatchObject({
        type: 'browser-api',
        message: 'window is not defined',
      })
    })
  })
})
