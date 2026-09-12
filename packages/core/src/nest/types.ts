import type { AssetVersion, TemplateFn } from '../protocol/types'
import type { ValidationOptions } from './validation'
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
   * The app's public URL (`https://app.example.com`). Optional: without it,
   * the origin comes from the request — the platform's `protocol` and `host`,
   * which honour Express's `trust proxy` / Fastify's `trustProxy` for
   * `X-Forwarded-*`. Set it when a proxy rewrites `Host` and you cannot
   * configure trust, or when links must use one canonical origin. When set,
   * `back()` only follows a `Referer` on exactly this origin.
   */
  url?: string
  /**
   * Content Security Policy support. The header itself is the app's (helmet
   * does it well); what only the adapter can do is put the same nonce on the
   * tags it renders. `nonce: true` makes one for every page load; without it,
   * a nonce is made only when the app asks for one with `nonce(req)` — which
   * is what its helmet configuration does anyway.
   */
  csp?: { nonce?: boolean }
  /**
   * How pages behave around the app's own authentication. nestjs-mvc ships no
   * login and no session: it reacts to what the app's guards already produce.
   * An `UnauthorizedException` on a page load or an Inertia visit becomes a
   * redirect to `loginUrl` (JSON clients keep the 401), remembering where the
   * visitor was going for `ViewService.intended()`. With `share`, every page
   * gets `auth.user`. And when the logged-in user changes, the client is reset
   * with one full page load, so nothing of the previous user stays in memory.
   */
  auth?: MvcAuthOptions
  /**
   * Cross-site request forgery protection, on by default: a request that
   * changes something must come from this app (`Sec-Fetch-Site` / `Origin`)
   * and carry the `X-XSRF-TOKEN` header the client copies from the
   * `XSRF-TOKEN` cookie. Answers 403 to another site, 419 to a missing or
   * stale token. `@SkipCsrf()` exempts a handler or controller (webhooks,
   * bearer-token APIs).
   *
   * `{ token: false }` keeps only the origin check; `false` turns protection
   * off and warns at boot. Off under a test runner (`NODE_ENV=test`) unless set
   * explicitly, so an app's supertest suite needs no tokens.
   */
  csrf?: boolean | { token?: boolean }
  /**
   * The secret keys everything the adapter hands the browser is signed with
   * (the flash cookie today). The first signs, all verify, so rotating means
   * putting the new key first and keeping the old one until its cookies have
   * expired. At least 32 characters each; `undefined` entries are skipped, so
   * `[process.env.APP_KEY, process.env.APP_PREVIOUS_KEY]` is fine.
   *
   * Defaults to `APP_KEY` plus the comma-separated `APP_PREVIOUS_KEYS` from the
   * environment. Without any key, production refuses to boot; development
   * uses a random key per process.
   */
  keys?: string | readonly (string | undefined)[]
  /**
   * Where flash data, validation errors and once-prop refreshes wait for the
   * next request. Defaults to a cookie the client carries (`CookieFlashStore`),
   * which keeps the server stateless. Bind `SessionFlashStore` or your own
   * `FlashStore` to use a session instead.
   */
  flash?: {
    /** A `FlashStore` class; it receives the `cookie` options plus `keys` (the `KeyRing`) as its only constructor argument. */
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
  errorPages?: (
    context: ErrorPageContext,
  ) => ErrorPage | ErrorRedirect | undefined | void | Promise<ErrorPage | ErrorRedirect | undefined | void>
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
  /**
   * How validation failures are reported: one or all messages per field, and
   * the status of the JSON answer on non-Inertia requests (`422` for
   * `useHttp()` and other JSON clients that expect Laravel's convention).
   */
  validation?: ValidationOptions
}

/**
 * The `auth` module option. Every member is optional; methods rather than
 * function properties, so `share(user: User)` type-checks without casts.
 */
export interface MvcAuthOptions {
  /** Where a page load or Inertia visit goes on a 401. Default `'/login'`; `false` keeps the 401. */
  loginUrl?: string | false
  /** Who is logged in, for this request. Default: `request.user`, where guards and Passport put it. */
  user?(request: AnyRequest): unknown
  /**
   * What of the user the page may see, as `auth.user`. Everything returned
   * ends up in the HTML source, so return only safe fields. Without it,
   * nothing is shared.
   */
  share?(user: unknown, request: AnyRequest): unknown
  /** How to tell users apart, for the identity reset. Default: `user.id ?? user.sub ?? user._id`. */
  id?(user: unknown): string | number | undefined | null
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

/**
 * Instead of a page, send the visitor somewhere with a flash message —
 * Laravel's `return back()->with(...)` from its exception handler. For errors
 * the user can recover from: a 429 on a form ("slow down"), a 403 on a
 * mutation. A 419 from CSRF on an Inertia visit already gets this by default.
 *
 * ```ts
 * errorPages: ({ status }) =>
 *   status === 429 ? { redirect: 'back', flash: { message: 'Too many attempts, try again in a minute.' } } : undefined
 * ```
 */
export interface ErrorRedirect {
  /** `'back'`: the page the request came from, when it is on this app (else `/`); or a path on this app. */
  redirect: 'back' | (string & {})
  /** Shown on the page the redirect lands on, as `page.flash`. */
  flash?: Record<string, unknown>
  /**
   * Errors for the form that was submitted, delivered the way a failed
   * validation is (and into its error bag): the client calls `onError`
   * instead of `onSuccess` and keeps what the user typed. Without errors a
   * redirect counts as a success on the client, so a form would reset. Use
   * `_form` (`ROOT_ERROR_KEY`) for a message that belongs to no field.
   */
  errors?: Record<string, unknown>
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
