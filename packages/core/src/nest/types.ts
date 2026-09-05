import type { AssetVersion, TemplateFn } from '../protocol/types'
import type { CookieFlashStoreOptions, FlashStore } from './flash'
import type { AnyRequest } from './http'
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
  /**
   * Renders your own page for HTTP errors instead of Nest's JSON — the
   * equivalent of Laravel's `Inertia::handleExceptionsUsing()`. Called for every
   * unhandled exception; return a page to render it with the error's status
   * code, or nothing to fall through to Nest's default handling:
   *
   * ```ts
   * errorPages: ({ status, isDevelopment }) => {
   *   if (isDevelopment) return                      // keep the stack trace while developing
   *   if ([403, 404, 500, 503].includes(status)) return { component: 'Errors/Show', props: { status }, shared: true }
   * }
   * ```
   */
  errorPages?: (context: ErrorPageContext) => ErrorPage | undefined | void | Promise<ErrorPage | undefined | void>
  /**
   * Called when a `defer(fn, { rescue: true })` prop throws; the page still
   * renders without it. Defaults to a logged warning naming the prop.
   */
  onRescue?: (error: unknown, path: string) => void
  /**
   * History behaviour on the client. `encrypt: true` asks it to encrypt every
   * page's history entry (sensitive apps); `@EncryptHistory()` per route and
   * `ViewService.encryptHistory()` per request override it.
   */
  history?: { encrypt?: boolean }
  /**
   * Lists the shared props' keys on every page object (`sharedProps`), so the
   * client keeps `auth`, `flash` and friends on screen during an instant visit
   * instead of blanking them. Defaults to `true`; matches Laravel's
   * `expose_shared_prop_keys`.
   */
  exposeSharedProps?: boolean
}

/** What `errorPages` gets to look at. */
export interface ErrorPageContext {
  /** The HTTP status: an `HttpException`'s, else 500. */
  status: number
  exception: unknown
  request: AnyRequest
  isInertia: boolean
  /** `NODE_ENV !== 'production'`. */
  isDevelopment: boolean
}

/** The page to render for an error; the response keeps the error's status code. */
export interface ErrorPage {
  component: string
  props?: Record<string, unknown>
  /** Include the props shared for this request (auth, flash, …). Default `false`. */
  shared?: boolean
  /** Server-render the first load, as `@Ssr()` would. Default: the route rules do not apply, so `false`. */
  ssr?: boolean
}
