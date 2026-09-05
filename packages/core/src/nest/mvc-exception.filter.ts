import { ArgumentsHost, BadRequestException, Catch, Inject } from '@nestjs/common'
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'
import { HEADER_ERROR_BAG } from '../protocol/constants'
import { type FlashStore, mergeBags } from './flash'
import { type AnyRequest, type AnyResponse, header, isInertia, requestMethod, requestState, setHeader } from './http'
import { MvcRedirect } from './redirect'
import { MVC_FLASH_STORE } from './tokens'
import { ValidationException } from './validation'

/**
 * Two protocol flows end here, both answered through Nest's HTTP adapter so
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
 */
@Catch(BadRequestException, MvcRedirect)
export class MvcExceptionFilter extends BaseExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost) private readonly host: HttpAdapterHost,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
  ) {
    super(host.httpAdapter)
  }

  async catch(exception: BadRequestException | MvcRedirect, argumentsHost: ArgumentsHost): Promise<void> {
    if (argumentsHost.getType() !== 'http') return super.catch(exception, argumentsHost)

    const ctx = argumentsHost.switchToHttp()
    const req = ctx.getRequest<AnyRequest>()
    const res = ctx.getResponse<AnyResponse>()

    if (exception instanceof MvcRedirect) return this.redirect(exception, req, res)

    if (!isInertia(req)) return super.catch(exception, argumentsHost)

    const errors = extractErrors(exception)
    if (!errors) return super.catch(exception, argumentsHost)

    const bag = header(req, HEADER_ERROR_BAG)
    const payload = bag ? { [bag]: errors } : errors

    await this.carry(req, res, { errors: payload })
    this.host.httpAdapter.redirect(res, this.statusFor(req, undefined), header(req, 'referer') ?? '/')
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
    await this.flash.write(req, res, bag)
  }

  /** The protocol's redirect status: 303 after a non-GET/POST visit, so the follow-up becomes a GET. */
  private statusFor(req: AnyRequest, explicit: number | undefined): number {
    if (explicit !== undefined && explicit !== 302) return explicit
    return ['PUT', 'PATCH', 'DELETE'].includes(requestMethod(req)) ? 303 : 302
  }
}

function extractErrors(exception: BadRequestException): Record<string, string> | null {
  if (exception instanceof ValidationException) return exception.errors

  const response = exception.getResponse()
  if (typeof response !== 'object' || response === null) return null
  const { message, errors } = response as { message?: unknown; errors?: unknown }

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(errors)) {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first === 'string') out[key] = first
    }
    return Object.keys(out).length > 0 ? out : null
  }

  // Default ValidationPipe shape: message is an array like "email must be an
  // email" — class-validator always prefixes the property name, so the first
  // word is the field. First message per field wins, matching Laravel.
  if (Array.isArray(message)) {
    const out: Record<string, string> = {}
    for (const msg of message) {
      if (typeof msg !== 'string' || msg.length === 0) continue
      const field = msg.split(' ', 1)[0]
      out[field] ??= msg
    }
    return Object.keys(out).length > 0 ? out : null
  }

  return null
}
