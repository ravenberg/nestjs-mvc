import { Injectable, type NestMiddleware } from '@nestjs/common'
import { nonce, type AnyRequest, type AnyResponse } from 'nestjs-mvc'

/**
 * A Content Security Policy with a nonce, written by hand so the demo has no
 * extra dependency; a real app would use helmet and pass the same
 * `nonce(req)` into its `scriptSrc`.
 *
 * What matters here is that **scripts need the nonce**: the client entry,
 * Vite's dev client and its React Refresh preamble all get it from
 * nestjs-mvc, so the page runs under a policy with no `unsafe-inline` for
 * scripts. `'self'` is there for the module imports the entry pulls in.
 *
 * Styles are the looser half: React style attributes and the progress bar's
 * own style element cannot carry a nonce, so `style-src` keeps
 * `'unsafe-inline'`. `connect-src` allows Vite's HMR socket in development.
 */
@Injectable()
export class CspMiddleware implements NestMiddleware {
  use(req: AnyRequest, res: AnyResponse, next: () => void): void {
    const policy = [
      `default-src 'self'`,
      `script-src 'nonce-${nonce(req)}' 'self'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data:`,
      `connect-src 'self' ws: wss:`,
      `base-uri 'none'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
    ].join('; ')
    ;(res as { setHeader?: (name: string, value: string) => unknown }).setHeader?.('Content-Security-Policy', policy)
    next()
  }
}
