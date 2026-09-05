import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { HEADER_INERTIA, HEADER_VERSION } from '../protocol/constants'
import { MVC_MODULE_OPTIONS, MVC_REQUEST_STATE } from './tokens'
import type { MvcRequestState } from '../protocol/types'
import type { MvcModuleOptions } from './types'
import { resolveVersion } from '../protocol/version'

/**
 * Handles the protocol concerns that must run before routing:
 * - initializes per-request state (shared props)
 * - converts 302 redirects to 303 for PUT/PATCH/DELETE Inertia visits,
 *   so the follow-up request becomes a GET
 * - answers stale-version GET visits with 409 + X-Inertia-Location
 */
@Injectable()
export class MvcMiddleware implements NestMiddleware {
  constructor(@Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const state: MvcRequestState = { shared: {} }
    ;(req as Request & Record<symbol, MvcRequestState>)[MVC_REQUEST_STATE] = state

    const isInertia = req.headers[HEADER_INERTIA] === 'true'

    if (isInertia && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalRedirect = res.redirect.bind(res)
      res.redirect = ((...args: unknown[]) => {
        const status = args.length === 2 ? (args[0] as number) : 302
        const url = (args.length === 2 ? args[1] : args[0]) as string
        return originalRedirect(status === 302 ? 303 : status, url)
      }) as Response['redirect']
    }

    if (isInertia && req.method === 'GET') {
      const version = await resolveVersion(this.options.version)
      if (version !== null && (req.headers[HEADER_VERSION] ?? '') !== version) {
        // v3 echoes the current version on the mismatch 409 so the client can observe it.
        res
          .status(409)
          .set('X-Inertia-Location', `${req.protocol}://${req.get('host')}${req.originalUrl}`)
          .set('X-Inertia-Version', version)
          .end()
        return
      }
    }

    next()
  }
}
