import { Inject, Injectable, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { Request, Response } from 'express'
import { HEADER_INERTIA, INERTIA_REQUEST_STATE } from './constants'
import type { InertiaRequestState } from './types'

/**
 * Request-scoped helper for sharing props and issuing external redirects.
 * Shared props are merged under the props returned by the handler.
 */
@Injectable({ scope: Scope.REQUEST })
export class InertiaService {
  constructor(@Inject(REQUEST) private readonly req: Request) {}

  private get state(): InertiaRequestState {
    const req = this.req as Request & Record<symbol, InertiaRequestState | undefined>
    return (req[INERTIA_REQUEST_STATE] ??= { shared: {} })
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
