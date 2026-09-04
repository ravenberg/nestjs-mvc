import 'reflect-metadata'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { View, ViteAssets, MvcModule, viewBody } from '../src/index'

@Controller()
class PagesController {
  @Get('/')
  @View('Home')
  home() {
    return {}
  }
}

/** Writes a Vite build manifest into a temp dir and returns that dir as the Vite root. */
function fakeBuild(manifest: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), 'inertia-vite-'))
  mkdirSync(join(root, 'dist/client/.vite'), { recursive: true })
  writeFileSync(join(root, 'dist/client/.vite/manifest.json'), JSON.stringify(manifest))
  return root
}

describe('ViteAssets', () => {
  it('returns no tags when Vite is not configured', () => {
    expect(new ViteAssets().tags()).toBe('')
  })

  it('resolves hashed script and style tags from the build manifest', () => {
    const root = fakeBuild({
      'frontend/main.tsx': { file: 'assets/main-abc.js', css: ['assets/main-abc.css'] },
    })
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root, dev: false })

    expect(assets.tags()).toBe(
      '<link rel="stylesheet" href="/build/assets/main-abc.css">\n' +
        '<script type="module" src="/build/assets/main-abc.js"></script>',
    )
  })

  it('collects CSS from statically imported chunks', () => {
    const root = fakeBuild({
      'frontend/main.tsx': { file: 'assets/main-abc.js', imports: ['_shared-def.js'] },
      '_shared-def.js': { file: 'assets/shared-def.js', css: ['assets/shared-def.css'] },
    })
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root, dev: false })

    expect(assets.tags()).toContain('href="/build/assets/shared-def.css"')
  })

  it('honours a custom base', () => {
    const root = fakeBuild({ 'frontend/main.tsx': { file: 'assets/main-abc.js' } })
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root, dev: false, base: '/static/' })

    expect(assets.tags()).toContain('src="/static/assets/main-abc.js"')
  })

  it('throws a helpful error when the entry is missing from the manifest', () => {
    const root = fakeBuild({ 'other.tsx': { file: 'assets/other.js' } })
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root, dev: false })

    expect(() => assets.tags()).toThrow(/not found in the Vite manifest/)
  })

  it('throws a helpful error when the manifest does not exist', () => {
    const assets = new ViteAssets({ entry: 'frontend/main.tsx', root: '/nope', dev: false })

    expect(() => assets.tags()).toThrow(/Could not read the Vite manifest/)
  })
})

describe('template asset tags (e2e)', () => {
  let app: INestApplication

  afterEach(async () => {
    await app?.close()
  })

  it('injects production asset tags into the rendered shell', async () => {
    const root = fakeBuild({
      'frontend/main.tsx': { file: 'assets/main-abc.js', css: ['assets/main-abc.css'] },
    })

    const moduleRef = await Test.createTestingModule({
      imports: [
        MvcModule.forRoot({
          version: 'v1',
          vite: { entry: 'frontend/main.tsx', root, dev: false },
          template: (page, ctx) => `<!DOCTYPE html><html><head>${ctx.assets()}</head><body>${viewBody(page)}</body></html>`,
        }),
      ],
      controllers: [PagesController],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    const res = await request(app.getHttpServer()).get('/').expect(200)
    expect(res.text).toContain('<script type="module" src="/build/assets/main-abc.js"></script>')
    expect(res.text).toContain('<link rel="stylesheet" href="/build/assets/main-abc.css">')
  })

  it('renders an empty assets() when no vite option is configured', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MvcModule.forRoot({
          version: 'v1',
          template: (page, ctx) => `<html><head>${ctx.assets()}</head><body>${viewBody(page)}</body></html>`,
        }),
      ],
      controllers: [PagesController],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    const res = await request(app.getHttpServer()).get('/').expect(200)
    expect(res.text).toContain('<head></head>')
  })
})
