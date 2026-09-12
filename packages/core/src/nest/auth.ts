import { HttpException, Inject, Injectable, Logger } from '@nestjs/common'
import { HEADER_VERSION } from '../protocol/constants'
import {
  type AnyRequest,
  type AnyResponse,
  clearCookie,
  header,
  isInertia,
  isPrecognitive,
  isPrefetch,
  isSafeRedirect,
  readCookie,
  requestMethod,
  requestOrigin,
  requestUrl,
  writeCookie,
} from './http'
import type { KeyRing } from './keys'
import { MVC_KEYS, MVC_MODULE_OPTIONS } from './tokens'
import type { MvcModuleOptions } from './types'

/** Where a 401 remembers the page the visitor was going to, until the login succeeds. */
export const INTENDED_COOKIE = 'mvc_intended'
/** A keyed digest of who was logged in on this client's last page; absent means nobody. */
export const IDENTITY_COOKIE = 'mvc_identity'

/** How long an intended URL waits for the login: long enough for a password manager and a 2FA code. */
const INTENDED_MAX_AGE = 3600

/**
 * A page's version, which the client keeps per page — per tab — and echoes in
 * `X-Inertia-Version` on every request it makes from that page: the asset
 * version, plus `#` and a digest of who the page was rendered for when
 * someone was logged in. That makes a page rendered for another user
 * recognisably stale, the same way a page from before a deploy is.
 */
export function versionFor(asset: string | null, identity: string | null | undefined): string | null {
  return identity ? `${asset ?? ''}#${identity}` : asset
}

/**
 * Who a page was rendered for, read back from the version it sent: the
 * digest, `null` for nobody, or `undefined` when its asset part is not the
 * current one (a page from before a deploy; the middleware answers that).
 * Matched against the known asset version, so a `#` inside it is harmless.
 */
export function identityInVersion(sent: string | undefined, asset: string | null): string | null | undefined {
  const value = sent ?? ''
  const prefix = asset ?? ''
  if (value === prefix) return null
  if (value.startsWith(`${prefix}#`)) return value.slice(prefix.length + 1) || null
  return undefined
}

/** A 401, whichever guard or library threw it. */
export const isUnauthenticated = (exception: unknown): boolean =>
  exception instanceof HttpException && exception.getStatus() === 401

/**
 * Whether the request wants a page rather than data: an Inertia visit, or a
 * browser navigation (`Accept: text/html`, not an XHR). `useHttp`, `fetch` and
 * Precognition want data, and get the status code instead of a redirect —
 * Laravel's `expectsJson()` line.
 */
export function wantsPage(req: AnyRequest): boolean {
  if (isPrecognitive(req)) return false
  if (isInertia(req)) return true
  if (header(req, 'x-requested-with')?.toLowerCase() === 'xmlhttprequest') return false
  return (header(req, 'accept') ?? '').includes('text/html')
}

/**
 * Who is logged in, as far as pages are concerned, read from whatever the
 * app's guards produced (`request.user` by default). Holds nothing about any
 * request: the only fields are the options, the keys, and two warn-once flags
 * that record that a development hint was already printed.
 */
@Injectable()
export class MvcAuth {
  private readonly logger = new Logger('MvcAuth')
  private readonly hints = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
  private warnedUnshared = false
  private warnedNoId = false

  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(MVC_KEYS) private readonly keys: KeyRing,
  ) {}

  /** The login page a 401 goes to, or `undefined` when `loginUrl: false`. */
  get loginUrl(): string | undefined {
    const url = this.options.auth?.loginUrl
    return url === false ? undefined : url ?? '/login'
  }

  /** The user the app's guards put on the request, if any. */
  user(req: AnyRequest): unknown {
    const auth = this.options.auth
    const user = auth?.user ? auth.user(req) : (req as AnyRequest & { user?: unknown }).user
    return user ?? undefined
  }

  /**
   * `auth.user` for the page: what `share` returns, or `null` when nobody is
   * logged in. `undefined` when the app does not share, so nothing is added.
   */
  async sharedUser(req: AnyRequest): Promise<unknown> {
    const user = this.user(req)
    const share = this.options.auth?.share
    if (!share) {
      if (user !== undefined && this.hints && !this.warnedUnshared) {
        this.warnedUnshared = true
        this.logger.warn(
          'request.user is set but not shared with the page. Add auth.share to MvcModule.forRoot() to show it; ' +
            'only the fields it returns reach the browser.',
        )
      }
      return undefined
    }
    return user === undefined ? null : ((await share(user, req)) ?? null)
  }

  // ── the identity reset ──────────────────────────────────────────────────────

  /** The version to give a page rendered for this request; see `versionFor`. */
  pageVersion(req: AnyRequest, asset: string | null): string | null {
    return versionFor(asset, this.identity(req))
  }

  /**
   * Whether the page this Inertia request comes from was rendered for someone
   * other than whoever is logged in now: a login, a logout, or a switch of
   * user — in this tab or in another one, since tabs share their cookies but
   * not their pages. `false` when it cannot be told (a user without an id).
   */
  pageIsStale(req: AnyRequest, asset: string | null): boolean {
    const current = this.identity(req)
    if (current === undefined) return false
    const rendered = identityInVersion(header(req, HEADER_VERSION), asset)
    return rendered !== undefined && rendered !== current
  }

  /**
   * Whether this browser's user changed since the last page it was shown, for
   * page loads that carry no page version (a full-page login, an OAuth
   * callback). `undefined` when it cannot be told (a user without an id) and
   * for a prefetch, which is not a navigation the user made.
   */
  identityChange(req: AnyRequest): { changed: boolean; current: string | null } | undefined {
    if (isPrefetch(req)) return undefined
    const current = this.identity(req)
    if (current === undefined) return undefined
    const previous = readCookie(req, IDENTITY_COOKIE) || null
    return { changed: current !== previous, current }
  }

  /** Records the user this client now sees; forgets it when nobody is logged in. */
  rememberIdentity(req: AnyRequest, res: AnyResponse, current: string | null): void {
    if (current === null) clearCookie(res, IDENTITY_COOKIE, { secure: this.secure(req) })
    else writeCookie(res, IDENTITY_COOKIE, current, { httpOnly: true, sameSite: 'Lax', secure: this.secure(req) })
  }

  /** A digest of the user's id; `null` for nobody; `undefined` when the user has no id to tell by. */
  private identity(req: AnyRequest): string | null | undefined {
    const user = this.user(req)
    if (user === undefined) return null
    const id = this.idOf(user)
    if (id === undefined || id === null || id === '') {
      if (this.hints && !this.warnedNoId) {
        this.warnedNoId = true
        this.logger.warn(
          'request.user has no id, sub or _id, so nestjs-mvc cannot tell when the user changes and the client ' +
            'keeps what the previous user loaded. Add auth.id to MvcModule.forRoot().',
        )
      }
      return undefined
    }
    return this.keys.digest('identity', String(id))
  }

  private idOf(user: unknown): string | number | undefined | null {
    if (this.options.auth?.id) return this.options.auth.id(user)
    if (typeof user !== 'object' || user === null) return undefined
    const { id, sub, _id } = user as { id?: unknown; sub?: unknown; _id?: unknown }
    const found = id ?? sub ?? _id
    return typeof found === 'string' || typeof found === 'number' ? found : found == null ? undefined : String(found)
  }

  // ── the intended URL ────────────────────────────────────────────────────────

  /**
   * Remembers where a visitor turned away by a 401 was going: the page itself
   * for a GET, the page the form was on for a mutation. A prefetch remembers
   * nothing, so hovering a protected link cannot overwrite it.
   */
  rememberIntended(req: AnyRequest, res: AnyResponse): void {
    if (isPrefetch(req)) return
    const url = requestMethod(req) === 'GET' ? requestUrl(req) : header(req, 'referer')
    if (!isSafeRedirect(url, req, this.options.url)) return
    writeCookie(res, INTENDED_COOKIE, this.keys.sign('intended', url), {
      maxAge: INTENDED_MAX_AGE,
      httpOnly: true,
      sameSite: 'Lax',
      secure: this.secure(req),
    })
  }

  /** The remembered URL, if it is ours, signed, and still on this app. */
  intended(req: AnyRequest): string | undefined {
    const stored = readCookie(req, INTENDED_COOKIE)
    const url = stored ? this.keys.verify('intended', stored) : undefined
    return isSafeRedirect(url, req, this.options.url) ? url : undefined
  }

  forgetIntended(req: AnyRequest, res: AnyResponse): void {
    clearCookie(res, INTENDED_COOKIE, { secure: this.secure(req) })
  }

  private secure(req: AnyRequest): boolean {
    return requestOrigin(req, this.options.url)?.startsWith('https:') ?? false
  }
}
