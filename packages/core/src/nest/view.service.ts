import { Inject, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { MvcRequestState } from '../protocol/types'
import { type AnyRequest, header, requestState } from './http'
import { MvcRedirect } from './redirect'

/**
 * Request-scoped helper: shared props, flash data, SSR overrides and redirects.
 * It only ever touches the request; responses are written by the exception
 * filter through Nest's HTTP adapter, so nothing here depends on the platform.
 */
@Injectable({ scope: Scope.REQUEST })
export class ViewService {
  constructor(@Inject(REQUEST) private readonly req: AnyRequest) {}

  private get state(): MvcRequestState {
    return requestState(this.req)
  }

  /** Shares props with the current page render (e.g. auth user). */
  share(key: string, value: unknown): this
  share(props: Record<string, unknown>): this
  share(keyOrProps: string | Record<string, unknown>, value?: unknown): this {
    if (typeof keyOrProps === 'string') this.state.shared[keyOrProps] = value
    else Object.assign(this.state.shared, keyOrProps)
    return this
  }

  getShared(): Record<string, unknown> {
    return this.state.shared
  }

  /**
   * Flashes data for the page object's `flash` field: shown on this request's
   * render if there is one, otherwise on the next request of this client,
   * typically after a redirect. Shown once, then gone.
   */
  flash(key: string, value: unknown): this
  flash(data: Record<string, unknown>): this
  flash(keyOrData: string | Record<string, unknown>, value?: unknown): this {
    const data = typeof keyOrData === 'string' ? { [keyOrData]: value } : keyOrData
    this.state.pending.flash = { ...this.state.pending.flash, ...data }
    return this
  }

  /**
   * Re-resolves the given `once()` keys on the next render even though the
   * client says it still holds them. Call it from the mutation that changed
   * the data, before redirecting back.
   */
  refresh(...keys: string[]): this {
    this.state.pending.refresh = [...new Set([...(this.state.pending.refresh ?? []), ...keys])]
    return this
  }

  /**
   * Asks the client to encrypt this page's history entry (or not), overriding
   * `@EncryptHistory()` and the module default for this request.
   */
  encryptHistory(enabled = true): this {
    this.state.encryptHistory = enabled
    return this
  }

  /**
   * Tells the client to rotate its history encryption key and drop what it
   * stored — call it on logout. Like `flash()`, it lands on this request's
   * render if there is one, otherwise on the next request after the redirect.
   */
  clearHistory(): this {
    this.state.pending.clearHistory = true
    return this
  }

  /**
   * Keeps the URL fragment the client visited with (`/settings#security`) on
   * the page that results from the redirect back, so the user lands on the
   * same section. Lands on this render or, after a redirect, the next.
   */
  preserveFragment(): this {
    this.state.pending.preserveFragment = true
    return this
  }

  /**
   * Skips server-side rendering for this request, even on a route that opted in
   * with `@Ssr()`. Useful from a guard once you know the visitor is logged in.
   */
  disableSsr(): this {
    this.state.ssr = false
    return this
  }

  /** Opts this request into server-side rendering, as `@Ssr()` would for the route. */
  enableSsr(): this {
    this.state.ssr = true
    return this
  }

  /**
   * Ends the request with a redirect, carrying any flashed data along. Uses 303
   * after PUT/PATCH/DELETE so the follow-up visit is a GET, as the protocol
   * requires. Nothing after this call runs.
   */
  redirect(url: string, status?: number): never {
    throw new MvcRedirect(url, status)
  }

  /** Redirects to the page the visit came from (the `Referer`), or `/`. */
  back(status?: number): never {
    throw new MvcRedirect(header(this.req, 'referer') ?? '/', status)
  }

  /**
   * Redirects to an external (non-Inertia) URL. During an Inertia visit this
   * answers 409 + X-Inertia-Location so the client performs a full page visit.
   */
  location(url: string): never {
    throw new MvcRedirect(url, undefined, true)
  }
}
