import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common'
import { MVC_VITE_SERVER } from './tokens'
import type { ViteDevServerHolder } from './vite'

/** The raw request, plus the two Express fields the mount-path fix touches. */
interface ViteRequest {
  url?: string
  originalUrl?: string
  baseUrl?: string
}

/**
 * Delegates to the in-process Vite dev server so client assets and HMR are served
 * from the Nest port. Vite calls `next()` for anything it does not own, leaving
 * application routes to Nest.
 */
@Injectable()
export class ViteDevMiddleware implements NestMiddleware {
  constructor(@Optional() @Inject(MVC_VITE_SERVER) private readonly holder: ViteDevServerHolder | null) {}

  use(req: ViteRequest, res: unknown, next: (err?: unknown) => void): void {
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
