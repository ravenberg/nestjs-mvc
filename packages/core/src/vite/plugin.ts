import { existsSync, readFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import type { Plugin, UserConfig } from 'vite'
import { type Framework, type Preset, presets } from './presets'

export type { Framework } from './presets'

export interface NestjsMvcPluginOptions {
  /** Directory holding the page components, relative to the Vite root. Defaults to `frontend/pages`. */
  pages?: string
  /**
   * Stylesheets linked from the HTML shell — as real `<link>` tags in development
   * too, so a server-rendered page never flashes unstyled. Defaults to
   * `frontend/app.css` when that file exists; pass `false` to link nothing.
   */
  css?: string | string[] | false
  /** Detected from `package.json` (`@inertiajs/react`, …). Set it to skip detection. */
  framework?: Framework
}

/** What the Nest side reads from the plugin at runtime, through `server.config.plugins[].api`. */
export interface NestjsMvcPluginApi {
  /** Virtual id of the generated client entry. */
  client: string
  /** Virtual id of the generated SSR entry. */
  ssr: string
  /** Stylesheets to link, relative to the Vite root. */
  css: string[]
}

export const PLUGIN_NAME = 'nestjs-mvc'
export const CLIENT_ENTRY = 'virtual:nestjs-mvc/client'
export const SSR_ENTRY = 'virtual:nestjs-mvc/ssr'

/** Rollup chunk name of the client entry; the manifest is searched by it in production. */
export const CLIENT_CHUNK = 'client'

const RESOLVED = '\0'

/**
 * Generates both entries of an Inertia app, so a project has no `main.tsx` and no
 * `ssr.tsx`: the page a route renders *is* the entry point. Add it to
 * `vite.config.ts` and the adapter finds everything else on its own:
 *
 * ```ts
 * import { nestjsMvc } from 'nestjs-mvc/vite'
 * export default defineConfig({ plugins: [react(), nestjsMvc()] })
 * ```
 *
 * - `vite build` produces the client bundle (`dist/client`, with a manifest) and
 *   the SSR bundle (`dist/ssr/ssr.js`) in one go.
 * - Stylesheets are separate entries, linked as `<link rel="stylesheet">` in
 *   development and production alike — no flash of unstyled content on
 *   server-rendered pages.
 * - The generated code is plain JavaScript (`createElement`, no JSX), so no
 *   framework plugin has to transform it.
 */
export function nestjsMvc(options: NestjsMvcPluginOptions = {}): Plugin {
  const pagesDir = (options.pages ?? 'frontend/pages').replace(/^\/|\/$/g, '')
  const api: NestjsMvcPluginApi = { client: CLIENT_ENTRY, ssr: SSR_ENTRY, css: [] }
  let preset: Preset | undefined

  return {
    name: PLUGIN_NAME,
    api,

    config(user, { command }) {
      const root = resolve(user.root ?? process.cwd())
      api.css = stylesheets(options.css, root)
      preset = presets[detectFramework(root, options.framework)]

      if (command !== 'build') return null

      const cssInputs = Object.fromEntries(api.css.map((file) => [basename(file, extname(file)), file]))
      const config: UserConfig = {
        base: user.base ?? '/build/',
        // One `vite build` builds both environments.
        builder: {},
        environments: {
          client: {
            build: {
              manifest: true,
              outDir: 'dist/client',
              emptyOutDir: true,
              rollupOptions: { input: { ...cssInputs, [CLIENT_CHUNK]: CLIENT_ENTRY } },
            },
          },
          ssr: {
            build: {
              ssr: true,
              outDir: 'dist/ssr',
              emptyOutDir: true,
              rollupOptions: { input: { ssr: SSR_ENTRY } },
            },
          },
        },
      }
      return config
    },

    resolveId(id) {
      if (id === CLIENT_ENTRY || id === SSR_ENTRY) return RESOLVED + id
      return null
    },

    load(id) {
      if (id === RESOLVED + CLIENT_ENTRY) return preset!.client(pageResolver(pagesDir, preset!.extensions, false))
      if (id === RESOLVED + SSR_ENTRY) return preset!.ssr(pageResolver(pagesDir, preset!.extensions, true))
      return null
    },
  }
}

/**
 * The page lookup shared by both entries: a root-relative `import.meta.glob`
 * (lazy on the client for code splitting, eager on the server) plus a resolver
 * that maps `@View('Users/Index')` to `<pages>/Users/Index.<ext>`.
 */
function pageResolver(pagesDir: string, extensions: string[], eager: boolean): string {
  const dir = `/${pagesDir}`
  const glob =
    extensions.length === 1 ? `${dir}/**/*.${extensions[0]}` : `${dir}/**/*.{${extensions.join(',')}}`
  const exts = JSON.stringify(extensions.map((ext) => `.${ext}`))

  return `
const pages = import.meta.glob(${JSON.stringify(glob)}${eager ? ', { eager: true }' : ''})
function resolvePage(name) {
  const key = ${exts}.map((ext) => ${JSON.stringify(`${dir}/`)} + name + ext).find((candidate) => candidate in pages)
  if (!key) {
    throw new Error('Page "' + name + '" not found. Expected ${pagesDir}/' + name + '.{${extensions.join(',')}} — check the string passed to @View().')
  }
  return ${eager ? 'pages[key]' : 'pages[key]()'}
}
`
}

function stylesheets(css: NestjsMvcPluginOptions['css'], root: string): string[] {
  if (css === false) return []
  if (css === undefined) return existsSync(join(root, 'frontend/app.css')) ? ['frontend/app.css'] : []
  return (Array.isArray(css) ? css : [css]).map((file) => file.replace(/^\//, ''))
}

const ADAPTERS: Record<string, Framework> = {
  '@inertiajs/react': 'react',
}

const UNSUPPORTED = ['@inertiajs/vue3', '@inertiajs/svelte']

function detectFramework(root: string, explicit?: Framework): Framework {
  if (explicit) return explicit

  let deps: Record<string, unknown> = {}
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as Record<string, unknown>
    deps = { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) }
  } catch {
    // No package.json at the root: fall through to the error below.
  }

  for (const [adapter, framework] of Object.entries(ADAPTERS)) if (adapter in deps) return framework

  const installed = UNSUPPORTED.find((adapter) => adapter in deps)
  throw new Error(
    installed
      ? `[nestjs-mvc] ${installed} is installed, but only React is supported so far.`
      : '[nestjs-mvc] Could not detect the frontend framework: install @inertiajs/react, ' +
          'or pass { framework } to nestjsMvc().',
  )
}
