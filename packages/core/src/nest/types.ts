import type { AssetVersion, TemplateFn } from '../protocol/types'
import type { ViteOptions } from './vite'

export interface MvcModuleOptions {
  /**
   * Asset version used for cache busting. When the client's version differs,
   * Inertia forces a full page visit (409 + X-Inertia-Location).
   * Typically a hash of your build manifest.
   */
  version?: AssetVersion
  /**
   * Renders the HTML shell for the initial (non-Inertia) page load.
   * Use `viewBody(page)` to render the root element and `ctx.assets()` for
   * the client bundle tags. Defaults to a minimal document.
   */
  template?: TemplateFn
  /**
   * Runs Vite in middleware mode inside this Nest process during development,
   * so a single process serves both the app and the client assets — no separate
   * `vite` command or second port. In production the same options resolve
   * hashed asset tags from the build manifest.
   */
  vite?: ViteOptions
}
