import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Options for running Vite inside the Nest process (dev) and resolving built assets (production). */
export interface ViteOptions {
  /** Client entry module, relative to `root`. E.g. `'frontend/main.tsx'`. */
  entry: string
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
  close: () => Promise<void>
}

interface ManifestChunk {
  file: string
  css?: string[]
  imports?: string[]
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
    if (this.devServer) {
      // Vite's transformIndexHtml injects the HMR client and any plugin preamble (e.g. React Refresh).
      return `<script type="module" src="/${this.options.entry}"></script>`
    }
    return this.productionTags(this.options)
  }

  /** In dev, lets Vite plugins rewrite the HTML (HMR client, React Refresh preamble). */
  async transformHtml(url: string, html: string): Promise<string> {
    const dev = this.devServer
    return dev ? dev.transformIndexHtml(url, html) : html
  }

  private productionTags(options: ViteOptions): string {
    const manifest = this.readManifest(options)
    const entry = manifest[options.entry]
    if (!entry) {
      throw new Error(
        `[nestjs-mvc] Entry "${options.entry}" not found in the Vite manifest. ` +
          `Check that \`vite.entry\` matches the \`build.rollupOptions.input\` path.`,
      )
    }

    const base = (options.base ?? '/build').replace(/\/$/, '')
    const css = new Set<string>()
    this.collectCss(manifest, options.entry, css, new Set())

    return [
      ...[...css].map((file) => `<link rel="stylesheet" href="${base}/${file}">`),
      `<script type="module" src="${base}/${entry.file}"></script>`,
    ].join('\n')
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
