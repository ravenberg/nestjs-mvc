import { Inject, Injectable, NestMiddleware } from '@nestjs/common'
import { HEADER_VERSION } from '../protocol/constants'
import { resolveVersion } from '../protocol/version'
import { type FlashStore, mergeBags } from './flash'
import { type AnyRequest, type AnyResponse, absoluteUrl, endRaw, header, isInertia, requestMethod, requestState } from './http'
import { MVC_FLASH_STORE, MVC_MODULE_OPTIONS } from './tokens'
import type { MvcModuleOptions } from './types'

type Next = (error?: unknown) => void

/**
 * Handles the protocol concerns that must run before routing:
 * - initializes per-request state (shared props, pending flash) on the raw request
 * - answers stale-version GET visits with 409 + X-Inertia-Location
 * - on Express, converts 302 redirects to 303 for PUT/PATCH/DELETE Inertia visits
 *   and carries pending flash data along, for code that calls `res.redirect()`
 *   itself (the portable way is `ViewService.redirect()` / `back()`)
 *
 * Middleware receives the raw Node request and response on every platform
 * (Express hands over its own objects, which are the raw ones extended), so this
 * file only uses the raw API.
 */
@Injectable()
export class MvcMiddleware implements NestMiddleware {
  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
  ) {}

  async use(req: AnyRequest, res: AnyResponse, next: Next): Promise<void> {
    requestState(req) // creates the per-request state on the raw request
    const inertia = isInertia(req)
    const method = requestMethod(req)

    this.patchExpressRedirect(req, res, inertia && ['PUT', 'PATCH', 'DELETE'].includes(method))

    if (inertia && method === 'GET') {
      const version = await resolveVersion(this.options.version)
      if (version !== null && (header(req, HEADER_VERSION) ?? '') !== version) {
        // v3 echoes the current version on the mismatch 409 so the client can
        // observe it. The flash bag is untouched, so it survives the full visit.
        endRaw(res, 409, { 'X-Inertia-Location': absoluteUrl(req), 'X-Inertia-Version': version })
        return
      }
    }

    next()
  }

  /** Express only: `res.redirect` exists on the response. Fastify code goes through `ViewService`. */
  private patchExpressRedirect(req: AnyRequest, res: AnyResponse, convertTo303: boolean): void {
    const expressRes = res as AnyResponse & { redirect?: (...args: unknown[]) => unknown }
    const original = expressRes.redirect
    if (typeof original !== 'function') return

    expressRes.redirect = (...args: unknown[]) => {
      const status = args.length === 2 ? (args[0] as number) : 302
      const url = (args.length === 2 ? args[1] : args[0]) as string
      const pending = requestState(req).pending
      if (pending.flash || pending.refresh) {
        // `res.redirect` is synchronous, so only a synchronous store can carry the
        // bag here; both shipped stores are. Async stores work through ViewService.
        const incoming = this.flash.read(req)
        void this.flash.write(req, res, mergeBags(incoming instanceof Promise ? undefined : incoming, pending))
      }
      return original.call(expressRes, convertTo303 && status === 302 ? 303 : status, url)
    }
  }
}
