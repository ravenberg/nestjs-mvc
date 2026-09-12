import 'reflect-metadata'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Controller, Get, Injectable, type INestApplication, type MiddlewareConsumer, Module, type NestMiddleware, type NestModule } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import {
  MvcModule,
  NONCE_PLACEHOLDER,
  View,
  ViteAssets,
  ViteDevServerHolder,
  currentNonce,
  nonce,
  type AnyRequest,
  type MvcModuleOptions,
  type PageObject,
  type TemplateContext,
  type ViteDevServerLike,
} from '../src/index'

const KEY = 'csp-nonce-test-key-'.padEnd(43, 'n')

@Controller()
class PagesController {
  @Get('page')
  @View('Page')
  page() {
    return {}
  }
}

/** What an app's helmet configuration does: ask for a nonce while building the header. */
@Injectable()
class CspHeader implements NestMiddleware {
  use(req: AnyRequest, res: { setHeader?: (name: string, value: string) => unknown }, next: () => void) {
    res.setHeader?.('Content-Security-Policy', `script-src 'nonce-${nonce(req)}'`)
    next()
  }
}

const template = (page: PageObject, ctx: TemplateContext): string =>
  `<!DOCTYPE html><html><head>${ctx.assets()}<script nonce="${ctx.nonce}">window.ok = 1</script></head><body>${ctx.body()}</body></html>`

async function boot(options: MvcModuleOptions = {}, withHeader = false): Promise<INestApplication> {
  @Module({})
  class Csp implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      if (withHeader) consumer.apply(CspHeader).forRoutes('{*splat}')
    }
  }
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], template, ...options }), Csp],
    controllers: [PagesController],
    providers: [CspHeader],
  }).compile()
  const app = moduleRef.createNestApplication({ logger: false })
  await app.init()
  return app
}

describe('the nonce on the request', () => {
  it('is made once and stays the same for the rest of the request', () => {
    const req = { headers: {} } as AnyRequest
    expect(currentNonce(req)).toBeUndefined()
    const first = nonce(req)
    expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(nonce(req)).toBe(first)
    expect(currentNonce(req)).toBe(first)
    expect(nonce({ headers: {} })).not.toBe(first)
  })
})

describe('the nonce on the page', () => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
  })

  it('is empty when the app asks for none', async () => {
    app = await boot()
    const res = await request(app.getHttpServer()).get('/page')
    expect(res.text).toContain('<script nonce="">')
  })

  it('is the one the app put on the request, so the header and the tags agree', async () => {
    app = await boot({}, true)
    const res = await request(app.getHttpServer()).get('/page')
    const fromHeader = /'nonce-([^']+)'/.exec(res.headers['content-security-policy'] as string)![1]
    expect(res.text).toContain(`<script nonce="${fromHeader}">`)
  })

  it('is made for every page load with csp: { nonce: true }', async () => {
    app = await boot({ csp: { nonce: true } })
    const first = /<script nonce="([^"]+)">/.exec((await request(app.getHttpServer()).get('/page')).text)![1]
    const second = /<script nonce="([^"]+)">/.exec((await request(app.getHttpServer()).get('/page')).text)![1]
    expect(first).toHaveLength(24)
    expect(second).not.toBe(first)
  })

  it('is not in the JSON of an Inertia visit, which has no tags to carry it', async () => {
    app = await boot({ csp: { nonce: true } })
    const res = await request(app.getHttpServer()).get('/page').set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
    expect(JSON.stringify(res.body)).not.toContain('nonce')
  })
})

describe('ViteAssets and the nonce', () => {
  /** Writes a Vite build manifest into a temp dir and returns that dir as the Vite root. */
  function fakeBuild(manifest: Record<string, unknown>): string {
    const root = mkdtempSync(join(tmpdir(), 'inertia-nonce-'))
    mkdirSync(join(root, 'dist/client/.vite'), { recursive: true })
    writeFileSync(join(root, 'dist/client/.vite/manifest.json'), JSON.stringify(manifest))
    return root
  }

  const root = () =>
    fakeBuild({
      'frontend/main.tsx': { file: 'assets/main-abc.js', isEntry: true, css: ['assets/main-def.css'] },
    })

  it('puts it on the built script and style tags, and leaves them alone without one', () => {
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root: root(), dev: false })
    expect(assets.tags('n0nce')).toContain('<script nonce="n0nce" type="module"')
    expect(assets.tags('n0nce')).toContain('<link nonce="n0nce" rel="stylesheet"')
    expect(assets.tags()).not.toContain('nonce')
  })

  /** A dev server that answers the way Vite does once `html.cspNonce` is set. */
  const devServer = (): ViteDevServerHolder => {
    const holder = new ViteDevServerHolder()
    holder.server = {
      transformIndexHtml: async (_url: string, html: string) =>
        `<meta property="csp-nonce" nonce="${NONCE_PLACEHOLDER}">` +
        `<script type="module" nonce="${NONCE_PLACEHOLDER}" src="/@vite/client"></script>${html}`,
    } as unknown as ViteDevServerLike
    return holder
  }

  it('swaps Vite’s placeholder for this request’s nonce', async () => {
    const assets = new ViteAssets({ root: '/nope' }, devServer())
    const html = await assets.transformHtml('/', '<div id="app"></div>', 'n0nce')
    expect(html).toContain('<script type="module" nonce="n0nce" src="/@vite/client">')
    expect(html).toContain('<meta property="csp-nonce" nonce="n0nce">')
    expect(html).not.toContain(NONCE_PLACEHOLDER)
  })

  it('takes the placeholder out again when the app uses no nonce', async () => {
    const assets = new ViteAssets({ root: '/nope' }, devServer())
    const html = await assets.transformHtml('/', '<div id="app"></div>')
    expect(html).toBe('<script type="module" src="/@vite/client"></script><div id="app"></div>')
  })
})

describe('the nonce on Fastify', () => {
  it('travels the same way', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], template, csp: { nonce: true } })],
      controllers: [PagesController],
    }).compile()
    const app = moduleRef.createNestApplication(new FastifyAdapter() as never, { logger: false })
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    const res = await request(app.getHttpServer()).get('/page')
    expect(res.text).toMatch(/<script nonce="[A-Za-z0-9+/=]{24}">/)
    await app.close()
  })
})
