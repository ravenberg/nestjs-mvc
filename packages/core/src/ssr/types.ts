import type { PageObject } from '../protocol/types'

/** The request being rendered, as reported alongside a failure. */
export interface SsrContext {
  /** Path without query string, e.g. `/contacts/12`. */
  path: string
  /** Full original URL including query string. */
  url: string
  method: string
  /** The page component being rendered, e.g. `Crm/Dashboard`. */
  component: string
  page: PageObject
}

/** Markup returned by the SSR renderer, filling the two slots of your template. */
export interface SsrResult {
  /** Elements belonging in `<head>` — title, meta tags. */
  head: string[]
  /** Replaces the root element and the page-object script. */
  body: string
}

/** Classified failure, mirroring the SSR server's error payload. */
export interface SsrError {
  message: string
  type: 'browser-api' | 'component-resolution' | 'render' | 'connection' | 'unknown'
  component?: string
  url?: string
  hint?: string
  stack?: string
  sourceLocation?: string
  browserApi?: string
}

export interface SsrRenderer {
  render(page: PageObject): Promise<SsrResult>
}

/**
 * How to render, not what to render: which routes are server-rendered is decided
 * by `@Ssr()` on the handler or controller (and `ViewService` at request time).
 * Omit the whole block until a route opts in.
 */
export interface SsrOptions {
  /**
   * SSR entry module, relative to the Vite root (e.g. `frontend/ssr.tsx`), loaded
   * in-process through Vite during development. Defaults to the entry that
   * `nestjsMvc()` generates, so only set it to bring your own. Its default export
   * takes the page object and returns an `SsrResult`.
   */
  entry?: string

  /**
   * Built SSR bundle used in production, imported into this process. Keeps the
   * app a single process — the separate Node SSR server exists in Inertia's
   * reference adapter only because PHP cannot run JavaScript. Defaults to
   * `dist/ssr/ssr.js`, where `vite build` with `nestjsMvc()` writes it. Relative
   * paths resolve against the Vite root, falling back to `process.cwd()`.
   */
  bundle?: string

  /**
   * Opt in to a standalone Inertia SSR server instead of rendering in-process,
   * for example to scale or isolate rendering. Unset by default; when set it
   * takes precedence over `bundle`.
   */
  url?: string

  /** Milliseconds before a render is abandoned and the page falls back to the client. */
  timeout?: number

  /**
   * Called when a render fails. Failures are never fatal: the response falls back
   * to client-side rendering. Defaults to logging a warning.
   */
  onError?: (error: SsrError) => void
}

export const DEFAULT_SSR_URL = 'http://127.0.0.1:13714'
export const DEFAULT_SSR_BUNDLE = 'dist/ssr/ssr.js'
export const DEFAULT_SSR_TIMEOUT = 5_000
