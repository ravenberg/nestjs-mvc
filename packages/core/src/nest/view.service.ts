import { Inject, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { Request, Response } from 'express'
import { HEADER_INERTIA } from '../protocol/constants'
import { MVC_REQUEST_STATE } from './tokens'
import type { MvcRequestState } from '../protocol/types'

/**
 * Request-scoped helper for sharing props and issuing external redirects.
 * Shared props are merged under the props returned by the handler.
 */
@Injectable({ scope: Scope.REQUEST })
export class ViewService {
  constructor(@Inject(REQUEST) private readonly req: Request) {}

  private get state(): MvcRequestState {
    const req = this.req as Request & Record<symbol, MvcRequestState | undefined>
    return (req[MVC_REQUEST_STATE] ??= { shared: {} })
  }

  /** Shares props with the current page render (e.g. auth user, flash messages). */
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
   * Redirects to an external (non-Inertia) URL. During an Inertia visit this
   * sends 409 + X-Inertia-Location so the client performs a full page visit.
   */
  location(url: string): void {
    const res = this.req.res as Response
    if (this.req.headers[HEADER_INERTIA] === 'true') {
      res.status(409).set('X-Inertia-Location', url).end()
    } else {
      res.redirect(url)
    }
  }
}
