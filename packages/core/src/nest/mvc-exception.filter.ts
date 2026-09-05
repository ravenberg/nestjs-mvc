import { ArgumentsHost, BadRequestException, Catch, Inject } from '@nestjs/common'
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'
import { HEADER_ERROR_BAG } from '../protocol/constants'
import { type FlashStore, isEmptyBag, mergeBags } from './flash'
import { type AnyRequest, type AnyResponse, header, isInertia, requestMethod, requestState, setHeader } from './http'
import { MvcRedirect } from './redirect'
import { MVC_FLASH_STORE } from './tokens'
import { extractFieldErrors } from './validation'
import { MvcPrecognition } from './precognition'

/**
 * Three protocol flows end here, all answered through Nest's HTTP adapter so
 * they work on Express and Fastify alike:
 *
 * - Validation failures on Inertia visits become the redirect-back flow: the
 *   field errors go into the flash bag and the client is sent back to the
 *   previous page, where the interceptor renders them as the `errors` prop.
 *   Honours `X-Inertia-Error-Bag`. Anything without field errors, and every
 *   non-Inertia request, falls through to Nest's default handling.
 * - `MvcRedirect`, thrown by `ViewService.redirect()` / `back()` / `location()`:
 *   pending flash data is stored, then the redirect is written — 303 after
 *   PUT/PATCH/DELETE, or 409 + X-Inertia-Location for an external destination.
 * - `MvcPrecognition`, thrown by the `PrecognitionInterceptor`: `204` +
 *   `Precognition-Success` or `422` + `errors`, never a redirect.
 */
@Catch(BadRequestException, MvcRedirect, MvcPrecognition)
export class MvcExceptionFilter extends BaseExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost) private readonly host: HttpAdapterHost,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
  ) {
    super(host.httpAdapter)
  }

  async catch(
    exception: BadRequestException | MvcRedirect | MvcPrecognition,
    argumentsHost: ArgumentsHost,
  ): Promise<void> {
    if (argumentsHost.getType() !== 'http') return super.catch(exception, argumentsHost)

    const ctx = argumentsHost.switchToHttp()
    const req = ctx.getRequest<AnyRequest>()
    const res = ctx.getResponse<AnyResponse>()

    if (exception instanceof MvcPrecognition) return this.precognition(exception, res)
    if (exception instanceof MvcRedirect) return this.redirect(exception, req, res)

    if (!isInertia(req)) return super.catch(exception, argumentsHost)

    const errors = extractFieldErrors(exception)
    if (!errors) return super.catch(exception, argumentsHost)

    const bag = header(req, HEADER_ERROR_BAG)
    const payload = bag ? { [bag]: errors } : errors

    await this.carry(req, res, { errors: payload })
    this.host.httpAdapter.redirect(res, this.statusFor(req, undefined), header(req, 'referer') ?? '/')
  }

  /** The verdict of a precognitive request, in the shape Laravel Precognition's client expects. */
  private precognition(verdict: MvcPrecognition, res: AnyResponse): void {
    setHeader(res, 'Precognition', 'true')
    if (verdict.errors === null) {
      setHeader(res, 'Precognition-Success', 'true')
      this.host.httpAdapter.reply(res, '', 204)
      return
    }
    this.host.httpAdapter.reply(res, { message: 'The given data was invalid.', errors: verdict.errors }, 422)
  }

  private async redirect(redirect: MvcRedirect, req: AnyRequest, res: AnyResponse): Promise<void> {
    await this.carry(req, res, {})

    if (redirect.external && isInertia(req)) {
      // The client performs a full page visit to the external URL.
      setHeader(res, 'X-Inertia-Location', redirect.url)
      this.host.httpAdapter.reply(res, '', 409)
      return
    }
    this.host.httpAdapter.redirect(res, this.statusFor(req, redirect.status), redirect.url)
  }

  /** Writes whatever this request queued, on top of what it received, for the next request. */
  private async carry(req: AnyRequest, res: AnyResponse, extra: { errors?: Record<string, unknown> }): Promise<void> {
    const bag = mergeBags(await this.flash.read(req), requestState(req).pending, extra)
    // A redirect with nothing to say leaves the client's cookies alone.
    if (isEmptyBag(bag)) return
    await this.flash.write(req, res, bag)
  }

  /** The protocol's redirect status: 303 after a non-GET/POST visit, so the follow-up becomes a GET. */
  private statusFor(req: AnyRequest, explicit: number | undefined): number {
    if (explicit !== undefined && explicit !== 302) return explicit
    return ['PUT', 'PATCH', 'DELETE'].includes(requestMethod(req)) ? 303 : 302
  }
}
