import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLIENT_CHUNK, PLUGIN_NAME, type NestjsMvcPluginApi } from '../vite/plugin'

/** Options for running Vite inside the Nest process (dev) and resolving built assets (production). */
export interface ViteOptions {
  /**
   * Client entry module, relative to `root`, e.g. `'frontend/main.tsx'`. Omit it
   * when `nestjsMvc()` from `nestjs-mvc/vite` is in your Vite config: the entry
   * is generated, and stylesheets are linked from the plugin's `css` option.
   */
  entry?: string
  /**
   * Project root containing `vite.config.*`. Defaults to `process.cwd()`.
   * Pass an absolute path when the process may be started from another directory.
   */
  root?: string
  /**
   * Run the Vite dev server in-process. Defaults to `NODE_ENV !== 'production'`.
   * When false, asset tags are resolved from the build manifest instead.
   */
  dev?: boolean
  /** Build output directory relative to `root`. Must match `build.outDir`. Defaults to `'dist/client'`. */
  buildDir?: string
  /** Public URL prefix the built assets are served under. Defaults to `'/build'`. */
  base?: string
  /** Extra inline Vite config merged into the dev server config. */
  config?: Record<string, unknown>
}

type Next = (err?: unknown) => void

/** Structural subset of Vite's `ViteDevServer` — avoids a hard type dependency on Vite. */
export interface ViteDevServerLike {
  middlewares: (req: unknown, res: unknown, next: Next) => void
  transformIndexHtml: (url: string, html: string) => Promise<string>
  /** Executes a module in Node with Vite's transforms applied — used for dev SSR. */
  ssrLoadModule: (url: string) => Promise<Record<string, unknown>>
  /** Rewrites a stack trace to point at original sources. */
  ssrFixStacktrace?: (error: Error) => void
  /** Resolved config; the `nestjs-mvc` plugin exposes its entries through `plugins[].api`. */
  config?: { plugins: readonly { name: string; api?: unknown }[] }
  close: () => Promise<void>
}

interface ManifestChunk {
  file: string
  name?: string
  isEntry?: boolean
  css?: string[]
  imports?: string[]
}

/** Reads what `nestjsMvc()` exposes at runtime, or `null` when the plugin is not in the Vite config. */
export function pluginApi(server: ViteDevServerLike | null | undefined): NestjsMvcPluginApi | null {
  const plugin = server?.config?.plugins.find((p) => p.name === PLUGIN_NAME)
  return (plugin?.api as NestjsMvcPluginApi | undefined) ?? null
}

export const isViteDev = (options: ViteOptions): boolean =>
  options.dev ?? process.env.NODE_ENV !== 'production'

const viteRoot = (options: ViteOptions): string => options.root ?? process.cwd()

/**
 * Boots a Vite dev server in middleware mode, so it shares the Nest process and port.
 * `appType: 'custom'` is required: it stops Vite from serving index.html or doing SPA fallback,
 * leaving routing to Nest.
 *
 * When `httpServer` is given, Vite attaches its HMR websocket to it instead of opening a
 * second port.
 */
export async function createViteDevServer(
  options: ViteOptions,
  httpServer?: unknown,
): Promise<ViteDevServerLike> {
  // Indirect specifier keeps bundlers from statically resolving Vite, which is an optional peer.
  const specifier = 'vite'
  const { createServer } = (await import(specifier)) as {
    createServer: (config: Record<string, unknown>) => Promise<ViteDevServerLike>
  }

  const server = (options.config?.server as Record<string, unknown>) ?? {}

  return createServer({
    root: viteRoot(options),
    appType: 'custom',
    ...options.config,
    server: {
      middlewareMode: true,
      ...(httpServer && server.hmr === undefined ? { hmr: { server: httpServer } } : {}),
      ...server,
    },
  })
}

/** Mutable holder: the dev server is created at bootstrap, after Nest's http.Server exists. */
export class ViteDevServerHolder {
  server: ViteDevServerLike | null = null
}

/** Resolves the `<script>` / `<link>` tags for the configured entry, in dev or production. */
export class ViteAssets {
  private manifest?: Record<string, ManifestChunk>

  constructor(
    private readonly options?: ViteOptions,
    private readonly holder?: ViteDevServerHolder,
  ) {}

  private get devServer(): ViteDevServerLike | null {
    return this.holder?.server ?? null
  }

  tags(): string {
    if (!this.options) return ''
    return this.devServer ? this.devTags(this.options, this.devServer) : this.productionTags(this.options)
  }

  /** Vite's transformIndexHtml later injects the HMR client and any plugin preamble (e.g. React Refresh). */
  private devTags(options: ViteOptions, server: ViteDevServerLike): string {
    if (options.entry) return `<script type="module" src="/${options.entry}"></script>`

    const api = pluginApi(server)
    if (!api) {
      throw new Error(
        '[nestjs-mvc] No client entry: add `nestjsMvc()` from "nestjs-mvc/vite" to vite.config.ts, ' +
          'or set `vite.entry`.',
      )
    }
    // Stylesheets as real links, so a server-rendered page is styled before any JS runs.
    return [
      ...api.css.map((file) => `<link rel="stylesheet" href="/${file}">`),
      `<script type="module" src="/@id/${api.client}"></script>`,
    ].join('\n')
  }

  /** In dev, lets Vite plugins rewrite the HTML (HMR client, React Refresh preamble). */
  async transformHtml(url: string, html: string): Promise<string> {
    const dev = this.devServer
    return dev ? dev.transformIndexHtml(url, html) : html
  }

  private productionTags(options: ViteOptions): string {
    const manifest = this.readManifest(options)
    const base = (options.base ?? '/build').replace(/\/$/, '')
    const css = new Set<string>()
    const [key, entry] = options.entry ? this.namedEntry(manifest, options.entry) : this.generatedEntry(manifest, css)
    this.collectCss(manifest, key, css, new Set())

    return [
      ...[...css].map((file) => `<link rel="stylesheet" href="${base}/${file}">`),
      `<script type="module" src="${base}/${entry.file}"></script>`,
    ].join('\n')
  }

  private namedEntry(manifest: Record<string, ManifestChunk>, entry: string): [string, ManifestChunk] {
    const chunk = manifest[entry]
    if (!chunk) {
      throw new Error(
        `[nestjs-mvc] Entry "${entry}" not found in the Vite manifest. ` +
          `Check that \`vite.entry\` matches the \`build.rollupOptions.input\` path.`,
      )
    }
    return [entry, chunk]
  }

  /**
   * With `nestjsMvc()` the client entry is a virtual module, so its manifest key
   * is not a path: find it by chunk name. Stylesheets are entries of their own.
   */
  private generatedEntry(manifest: Record<string, ManifestChunk>, css: Set<string>): [string, ManifestChunk] {
    const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry)
    const client =
      entries.find(([, chunk]) => chunk.name === CLIENT_CHUNK) ??
      entries.find(([, chunk]) => chunk.file.endsWith('.js'))
    if (!client) {
      throw new Error(
        '[nestjs-mvc] No client entry in the Vite manifest. Build with `nestjsMvc()` in vite.config.ts, ' +
          'or set `vite.entry`.',
      )
    }
    for (const [, chunk] of entries) if (chunk.file.endsWith('.css')) css.add(chunk.file)
    return client
  }

  /** CSS can live on statically imported chunks too, so walk the import graph. */
  private collectCss(
    manifest: Record<string, ManifestChunk>,
    key: string,
    out: Set<string>,
    seen: Set<string>,
  ): void {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    if (!chunk) return
    for (const file of chunk.css ?? []) out.add(file)
    for (const imported of chunk.imports ?? []) this.collectCss(manifest, imported, out, seen)
  }

  private readManifest(options: ViteOptions): Record<string, ManifestChunk> {
    if (this.manifest) return this.manifest
    const path = join(viteRoot(options), options.buildDir ?? 'dist/client', '.vite/manifest.json')
    try {
      this.manifest = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, ManifestChunk>
    } catch (cause) {
      throw new Error(
        `[nestjs-mvc] Could not read the Vite manifest at ${path}. Run your client build first.`,
        { cause },
      )
    }
    return this.manifest
  }
}
