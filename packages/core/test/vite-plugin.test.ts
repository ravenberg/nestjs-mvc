import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ConfigEnv, Plugin, UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { CLIENT_ENTRY, SSR_ENTRY, nestjsMvc, type NestjsMvcPluginApi } from '../src/vite-plugin'
import { ViteAssets, pluginApi } from '../src/index'

/** A project root with a package.json and, optionally, a default stylesheet. */
function project(deps: Record<string, string>, files: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), 'mvc-plugin-'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: deps }))
  for (const file of files) {
    mkdirSync(join(root, file, '..'), { recursive: true })
    writeFileSync(join(root, file), '')
  }
  return root
}

const serve: ConfigEnv = { command: 'serve', mode: 'development' }
const build: ConfigEnv = { command: 'build', mode: 'production' }

/** Runs the plugin's config hook the way Vite would, returning what it contributes. */
function configure(plugin: Plugin, user: UserConfig, env: ConfigEnv): UserConfig | null {
  const hook = plugin.config as (this: unknown, config: UserConfig, env: ConfigEnv) => UserConfig | null
  return hook.call({}, user, env)
}

function generated(plugin: Plugin, id: string): string {
  const resolve = plugin.resolveId as (this: unknown, id: string) => string | null
  const load = plugin.load as (this: unknown, id: string) => string | null
  const resolved = resolve.call({}, id)
  expect(resolved).toBeTruthy()
  return load.call({}, resolved!)!
}

describe('nestjsMvc() plugin', () => {
  it('detects React from package.json', () => {
    const plugin = nestjsMvc()
    expect(() => configure(plugin, { root: project({ '@inertiajs/react': '^3' }) }, serve)).not.toThrow()
  })

  it('explains itself when no adapter is installed, or an unsupported one', () => {
    expect(() => configure(nestjsMvc(), { root: project({}) }, serve)).toThrow(/install @inertiajs\/react/)
    expect(() => configure(nestjsMvc(), { root: project({ '@inertiajs/vue3': '^3' }) }, serve)).toThrow(
      /only React is supported so far/,
    )
  })

  it('generates a client entry that lazily resolves pages from the pages directory', () => {
    const plugin = nestjsMvc()
    configure(plugin, { root: project({ '@inertiajs/react': '^3' }) }, serve)

    const code = generated(plugin, CLIENT_ENTRY)

    expect(code).toContain(`import.meta.glob("/frontend/pages/**/*.{tsx,jsx}")`)
    expect(code).toContain('pages[key]()')
    expect(code).toContain("from '@inertiajs/react'")
    expect(code).toContain('createRoot(el)')
    // Plain JavaScript: no framework plugin has to transform it.
    expect(code).not.toMatch(/<[A-Z]/)
  })

  it('generates an SSR entry that eagerly resolves pages and default-exports a render function', () => {
    const plugin = nestjsMvc({ pages: 'resources/pages' })
    configure(plugin, { root: project({ '@inertiajs/react': '^3' }) }, serve)

    const code = generated(plugin, SSR_ENTRY)

    expect(code).toContain(`import.meta.glob("/resources/pages/**/*.{tsx,jsx}", { eager: true })`)
    expect(code).toContain('export default function render(page)')
    expect(code).toContain('renderToString')
  })

  it('names the page it could not find, in terms of @View()', () => {
    const plugin = nestjsMvc()
    configure(plugin, { root: project({ '@inertiajs/react': '^3' }) }, serve)

    expect(generated(plugin, CLIENT_ENTRY)).toContain('check the string passed to @View()')
  })

  it('links frontend/app.css by default when it exists, and honours css overrides', () => {
    const withCss = project({ '@inertiajs/react': '^3' }, ['frontend/app.css'])
    const without = project({ '@inertiajs/react': '^3' })

    const a = nestjsMvc()
    configure(a, { root: withCss }, serve)
    expect((a.api as NestjsMvcPluginApi).css).toEqual(['frontend/app.css'])

    const b = nestjsMvc()
    configure(b, { root: without }, serve)
    expect((b.api as NestjsMvcPluginApi).css).toEqual([])

    const c = nestjsMvc({ css: ['/styles/a.css', 'styles/b.css'] })
    configure(c, { root: without }, serve)
    expect((c.api as NestjsMvcPluginApi).css).toEqual(['styles/a.css', 'styles/b.css'])

    const d = nestjsMvc({ css: false })
    configure(d, { root: withCss }, serve)
    expect((d.api as NestjsMvcPluginApi).css).toEqual([])
  })

  it('contributes nothing to the dev config, and a two-environment build otherwise', () => {
    const root = project({ '@inertiajs/react': '^3' }, ['frontend/app.css'])
    const plugin = nestjsMvc()

    expect(configure(plugin, { root }, serve)).toBeNull()

    const config = configure(plugin, { root }, build)!
    expect(config.base).toBe('/build/')
    expect(config.builder).toEqual({})
    expect(config.environments?.client?.build).toMatchObject({
      manifest: true,
      outDir: 'dist/client',
      rollupOptions: { input: { app: 'frontend/app.css', client: CLIENT_ENTRY } },
    })
    expect(config.environments?.ssr?.build).toMatchObject({
      ssr: true,
      outDir: 'dist/ssr',
      rollupOptions: { input: { ssr: SSR_ENTRY } },
    })
  })

  it('leaves a base the user chose alone', () => {
    const plugin = nestjsMvc()
    const config = configure(plugin, { root: project({ '@inertiajs/react': '^3' }), base: '/static/' }, build)!
    expect(config.base).toBe('/static/')
  })
})

describe('ViteAssets with generated entries', () => {
  const api: NestjsMvcPluginApi = { client: CLIENT_ENTRY, ssr: SSR_ENTRY, css: ['frontend/app.css'] }
  const devServer = {
    middlewares: () => {},
    transformIndexHtml: async (_url: string, html: string) => html,
    ssrLoadModule: async () => ({}),
    close: async () => {},
    config: { plugins: [{ name: 'react' }, { name: 'nestjs-mvc', api }] },
  }

  it('reads the plugin api off the dev server', () => {
    expect(pluginApi(devServer)).toBe(api)
    expect(pluginApi({ ...devServer, config: { plugins: [{ name: 'react' }] } })).toBeNull()
    expect(pluginApi(null)).toBeNull()
  })

  it('links stylesheets before the virtual client entry in development', () => {
    const holder = { server: devServer }
    const assets = new ViteAssets({}, holder)

    expect(assets.tags()).toBe(
      '<link rel="stylesheet" href="/frontend/app.css">\n' +
        `<script type="module" src="/@id/${CLIENT_ENTRY}"></script>`,
    )
  })

  it('asks for the plugin when neither it nor an entry is configured', () => {
    const holder = { server: { ...devServer, config: { plugins: [] } } }
    expect(() => new ViteAssets({}, holder).tags()).toThrow(/add `nestjsMvc\(\)`/)
  })

  it('still honours an explicit entry in development', () => {
    const holder = { server: devServer }
    expect(new ViteAssets({ entry: 'frontend/main.tsx' }, holder).tags()).toBe(
      '<script type="module" src="/frontend/main.tsx"></script>',
    )
  })

  it('finds the client chunk and stylesheet entries in a production manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'mvc-manifest-'))
    mkdirSync(join(root, 'dist/client/.vite'), { recursive: true })
    writeFileSync(
      join(root, 'dist/client/.vite/manifest.json'),
      JSON.stringify({
        'frontend/app.css': { file: 'assets/app-1.css', isEntry: true },
        '../weird/virtual:nestjs-mvc/client': {
          file: 'assets/client-2.js',
          name: 'client',
          isEntry: true,
          css: ['assets/client-2.css'],
        },
        'frontend/pages/Home.tsx': { file: 'assets/Home-3.js', isDynamicEntry: true },
      }),
    )

    expect(new ViteAssets({ root, dev: false }).tags()).toBe(
      '<link rel="stylesheet" href="/build/assets/app-1.css">\n' +
        '<link rel="stylesheet" href="/build/assets/client-2.css">\n' +
        '<script type="module" src="/build/assets/client-2.js"></script>',
    )
  })

  it('explains a manifest without a client entry', () => {
    const root = mkdtempSync(join(tmpdir(), 'mvc-manifest-'))
    mkdirSync(join(root, 'dist/client/.vite'), { recursive: true })
    writeFileSync(join(root, 'dist/client/.vite/manifest.json'), JSON.stringify({ 'x.css': { file: 'x.css' } }))

    expect(() => new ViteAssets({ root, dev: false }).tags()).toThrow(/No client entry in the Vite manifest/)
  })
})
