import type { InertiaViteOptions } from './vite'

/** The Inertia page object sent to the client, either as JSON or embedded in the HTML shell. */
export interface InertiaPage {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
  deferredProps?: Record<string, string[]>
  mergeProps?: string[]
  clearHistory?: boolean
  encryptHistory?: boolean
}

export type InertiaVersion = string | (() => string | Promise<string>)

/** Helpers passed to the `template` function. */
export interface InertiaTemplateContext {
  /**
   * Script/style tags for the configured Vite entry. Returns dev-server tags
   * during development and hashed, manifest-resolved tags in production.
   * Empty string when no `vite` option is configured.
   */
  assets: () => string
}

export type InertiaTemplate = (
  page: InertiaPage,
  ctx: InertiaTemplateContext,
) => string | Promise<string>

export interface InertiaModuleOptions {
  /**
   * Asset version used for cache busting. When the client's version differs,
   * Inertia forces a full page visit (409 + X-Inertia-Location).
   * Typically a hash of your build manifest.
   */
  version?: InertiaVersion
  /**
   * Renders the HTML shell for the initial (non-Inertia) page load.
   * Use `inertiaBody(page)` to render the root element and `ctx.assets()` for
   * the client bundle tags. Defaults to a minimal document.
   */
  template?: InertiaTemplate
  /**
   * Runs Vite in middleware mode inside this Nest process during development,
   * so a single process serves both the app and the client assets — no separate
   * `vite` command or second port. In production the same options resolve
   * hashed asset tags from the build manifest.
   */
  vite?: InertiaViteOptions
}

/** Per-request state stored on the request object by the middleware. */
export interface InertiaRequestState {
  shared: Record<string, unknown>
}
