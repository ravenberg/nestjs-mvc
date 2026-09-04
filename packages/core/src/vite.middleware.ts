import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { INERTIA_VITE_SERVER } from './constants'
import type { ViteDevServerHolder } from './vite'

/**
 * Delegates to the in-process Vite dev server so client assets and HMR are served
 * from the Nest port. Vite calls `next()` for anything it does not own, leaving
 * application routes to Nest.
 */
@Injectable()
export class ViteDevMiddleware implements NestMiddleware {
  constructor(@Optional() @Inject(INERTIA_VITE_SERVER) private readonly holder: ViteDevServerHolder | null) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const vite = this.holder?.server
    if (!vite) return next()

    // Nest mounts middleware on a wildcard path, and Express strips that mount
    // prefix from `req.url` — leaving Vite with "/" for every request. Restore the
    // full URL for Vite, then put it back if Vite hands the request on to Nest.
    const { url, baseUrl } = req
    req.url = req.originalUrl || url
    req.baseUrl = ''

    vite.middlewares(req, res, (err?: unknown) => {
      req.url = url
      req.baseUrl = baseUrl
      next(err)
    })
  }
}
