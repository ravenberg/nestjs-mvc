import { ArgumentsHost, BadRequestException, Catch, HttpException, Inject, Logger } from '@nestjs/common'
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'
import { HEADER_ERROR_BAG } from '../protocol/constants'
import { type FlashStore, isEmptyBag, mergeBags } from './flash'
import { type AnyRequest, type AnyResponse, header, isInertia, requestMethod, requestState, setHeader } from './http'
import { PageRenderer } from './page-renderer'
import { MvcPrecognition } from './precognition'
import { MvcRedirect } from './redirect'
import { MVC_FLASH_STORE, MVC_MODULE_OPTIONS } from './tokens'
import type { MvcModuleOptions } from './types'
import { extractFieldErrors } from './validation'

/**
 * Four protocol flows end here, all answered through Nest's HTTP adapter so
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
 * - Everything else, when `errorPages` is configured: the page it returns is
 *   rendered with the error's status code, so a 404 is your own component
 *   instead of Nest's JSON. Without it, or when it returns nothing, Nest's
 *   default handling applies.
 */
@Catch()
export class MvcExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('MvcErrors')

  constructor(
    @Inject(HttpAdapterHost) private readonly host: HttpAdapterHost,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(PageRenderer) private readonly renderer: PageRenderer,
  ) {
    super(host.httpAdapter)
  }

  async catch(exception: unknown, argumentsHost: ArgumentsHost): Promise<void> {
    if (argumentsHost.getType() !== 'http') return super.catch(exception, argumentsHost)

    const ctx = argumentsHost.switchToHttp()
    const req = ctx.getRequest<AnyRequest>()
    const res = ctx.getResponse<AnyResponse>()

    if (exception instanceof MvcPrecognition) return this.precognition(exception, res)
    if (exception instanceof MvcRedirect) return this.redirect(exception, req, res)

    if (exception instanceof BadRequestException && isInertia(req)) {
      const errors = extractFieldErrors(exception)
      if (errors) return this.validationFailed(errors, req, res)
    }

    if (await this.errorPage(exception, req, res)) return
    return super.catch(exception, argumentsHost)
  }

  /** The redirect-back flow: field errors into the bag, back to the referer. */
  private async validationFailed(errors: Record<string, string>, req: AnyRequest, res: AnyResponse): Promise<void> {
    const bag = header(req, HEADER_ERROR_BAG)
    const payload = bag ? { [bag]: errors } : errors

    await this.carry(req, res, { errors: payload })
    this.host.httpAdapter.redirect(res, this.statusFor(req, undefined), header(req, 'referer') ?? '/')
  }

  /** Renders the configured error page, if any; `false` means "not handled here". */
  private async errorPage(exception: unknown, req: AnyRequest, res: AnyResponse): Promise<boolean> {
    if (!this.options.errorPages) return false

    const status = exception instanceof HttpException ? exception.getStatus() : 500
    const page = await this.options.errorPages({
      status,
      exception,
      request: req,
      isInertia: isInertia(req),
      isDevelopment: process.env.NODE_ENV !== 'production',
    })
    if (!page) return false

    // Nest's default filter logs unknown errors; keep that when we take over.
    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception))

    try {
      const rendered = await this.renderer.render(page.component, page.props ?? {}, req, res, {
        shared: page.shared ?? false,
        ssrDecorator: page.ssr ?? false,
      })
      this.host.httpAdapter.reply(res, rendered.kind === 'json' ? rendered.page : rendered.html, status)
      return true
    } catch (cause) {
      // The error page itself failed: fall back to Nest rather than loop.
      this.logger.error(`Could not render error page ${page.component}: ${(cause as Error).message}`)
      return false
    }
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
