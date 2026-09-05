import type { AssetVersion, TemplateFn } from '../protocol/types'
import type { CookieFlashStoreOptions, FlashStore } from './flash'
import type { SsrOptions } from '../ssr/types'
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
   * hashed asset tags from the build manifest. With `nestjsMvc()` in your Vite
   * config, `vite: {}` is enough.
   */
  vite?: ViteOptions
  /**
   * How server-side rendering runs (entry, bundle, timeouts). With `nestjsMvc()`
   * in your Vite config none of it is needed: `@Ssr()` on a handler or controller
   * is the whole story, and nothing renders on the server until a route opts in.
   */
  ssr?: SsrOptions
  /**
   * Where flash data, validation errors and once-prop refreshes wait for the
   * next request. Defaults to a cookie the client carries (`CookieFlashStore`),
   * which keeps the server stateless. Bind `SessionFlashStore` or your own
   * `FlashStore` to use a session instead.
   */
  flash?: {
    /** A `FlashStore` class; it receives `cookie` as its only constructor argument. */
    store?: new (options?: never) => FlashStore
    cookie?: CookieFlashStoreOptions
  }
}
