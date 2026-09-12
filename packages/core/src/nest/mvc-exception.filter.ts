import { ArgumentsHost, BadRequestException, Catch, HttpException, Inject, Logger } from '@nestjs/common'
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core'
import { HEADER_ERROR_BAG } from '../protocol/constants'
import { type FlashStore, isEmptyBag, mergeBags } from './flash'
import {
  type AnyRequest,
  type AnyResponse,
  header,
  isInertia,
  isPrecognitive,
  isPrefetch,
  previousUrl,
  requestMethod,
  requestPath,
  requestState,
  setHeader,
} from './http'
import { MvcAuth, isUnauthenticated, wantsPage } from './auth'
import { CsrfTokenMismatchException } from './csrf'
import { PageRenderer } from './page-renderer'
import { MvcPrecognition } from './precognition'
import { MvcRedirect } from './redirect'
import { MVC_FLASH_STORE, MVC_MODULE_OPTIONS } from './tokens'
import type { ErrorRedirect, MvcModuleOptions } from './types'
import { ROOT_ERROR_KEY, extractFieldErrors, type FieldErrors } from './validation'

/** The flash an Inertia visit gets back after a 419, under the key Inertia's own docs use. */
export const PAGE_EXPIRED_MESSAGE = 'This page has expired. Please try again.'

/**
 * Four protocol flows end here, all answered through Nest's HTTP adapter so
 * they work on Express and Fastify alike:
 *
 * - Validation failures on Inertia visits become the redirect-back flow: the
 *   field errors go into the flash bag and the client is sent back to the
 *   previous page, where the interceptor renders them as the `errors` prop.
 *   Honours `X-Inertia-Error-Bag`. Anything without field errors falls through
 *   to Nest's default handling, and so does every non-Inertia request unless
 *   `validation.jsonStatus: 422` asks for Laravel's `422` + `{ errors }`.
 * - `MvcRedirect`, thrown by `ViewService.redirect()` / `back()` / `location()`:
 *   pending flash data is stored, then the redirect is written — 303 after
 *   PUT/PATCH/DELETE, 409 + X-Inertia-Location for an external destination, or
 *   409 + X-Inertia-Redirect when the target has a fragment (XHR would lose it).
 * - `MvcPrecognition`, thrown by the `PrecognitionInterceptor`: `204` +
 *   `Precognition-Success` or `422` + `errors`, never a redirect.
 * - Everything else, when `errorPages` is configured: the page it returns is
 *   rendered with the error's status code, so a 404 is your own component
 *   instead of Nest's JSON; or, when it returns `{ redirect, flash }`, the
 *   visitor is sent there with the message. Without it, or when it returns
 *   nothing: a 401 on a page load or Inertia visit goes to the login page
 *   (remembering where it was going), a CSRF 419 on an Inertia visit goes back
 *   with "This page has expired", and everything else gets Nest's default.
 */
@Catch()
export class MvcExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('MvcErrors')

  constructor(
    @Inject(HttpAdapterHost) private readonly host: HttpAdapterHost,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(PageRenderer) private readonly renderer: PageRenderer,
    @Inject(MvcAuth) private readonly auth: MvcAuth,
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

    if (exception instanceof BadRequestException) {
      const errors = extractFieldErrors(exception, this.options.validation)
      if (errors && isInertia(req)) return this.validationFailed(errors, req, res)
      if (errors && this.options.validation?.jsonStatus === 422) return this.unprocessable(errors, res)
    }

    if (await this.errorPage(exception, req, res)) return

    // Whatever guard said "I don't know who you are": a page load or an Inertia
    // visit goes to the login page, and comes back here after it. JSON clients
    // keep the 401. The login page itself is never sent to the login page.
    // An absolute login URL (a hosted identity provider) is a full page visit, as location() is.
    const loginUrl = this.auth.loginUrl
    const external = !!loginUrl && /^https?:\/\//i.test(loginUrl)
    const onLoginPage = !external && requestPath(req) === loginUrl?.split('?')[0]
    if (loginUrl && isUnauthenticated(exception) && wantsPage(req) && !onLoginPage) {
      this.auth.rememberIntended(req, res)
      return this.redirect(new MvcRedirect(loginUrl, undefined, external), req, res)
    }

    // A stale token on an Inertia visit is not an error to show; send the user
    // back to try again, with the fresh token the guard already set. The message
    // travels as a flash to show and as a form-level error, so the client runs
    // `onError` rather than `onSuccess` and the form keeps what was typed.
    if (exception instanceof CsrfTokenMismatchException && isInertia(req) && !isPrecognitive(req)) {
      return this.errorRedirect(
        {
          redirect: 'back',
          flash: { message: PAGE_EXPIRED_MESSAGE },
          errors: { [ROOT_ERROR_KEY]: PAGE_EXPIRED_MESSAGE },
        },
        req,
        res,
      )
    }
    return super.catch(exception, argumentsHost)
  }

  /** An `ErrorRedirect`: flash and errors on top of what the request queued, then the usual redirect. */
  private async errorRedirect({ redirect, flash, errors }: ErrorRedirect, req: AnyRequest, res: AnyResponse): Promise<void> {
    const pending = requestState(req).pending
    if (flash) pending.flash = { ...pending.flash, ...flash }
    const url = redirect === 'back' ? previousUrl(req, '/', this.options.url) : redirect
    return this.redirect(new MvcRedirect(url), req, res, errors ? { errors: this.inErrorBag(req, errors) } : {})
  }

  /** Errors scoped to the form's `X-Inertia-Error-Bag`, when it named one. */
  private inErrorBag(req: AnyRequest, errors: Record<string, unknown>): Record<string, unknown> {
    const bag = header(req, HEADER_ERROR_BAG)
    return bag ? { [bag]: errors } : errors
  }

  /** The redirect-back flow: field errors into the bag, back to the referer. */
  private async validationFailed(errors: FieldErrors, req: AnyRequest, res: AnyResponse): Promise<void> {
    await this.carry(req, res, { errors: this.inErrorBag(req, errors) })
    this.host.httpAdapter.redirect(res, this.statusFor(req, undefined), previousUrl(req, '/', this.options.url))
  }

  /** Laravel's answer to an invalid JSON request, opted into with `validation.jsonStatus: 422`. */
  private unprocessable(errors: FieldErrors, res: AnyResponse): void {
    this.host.httpAdapter.reply(res, { message: 'The given data was invalid.', errors }, 422)
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

    if ('redirect' in page) {
      await this.errorRedirect(page, req, res)
      return true
    }

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

  private async redirect(
    redirect: MvcRedirect,
    req: AnyRequest,
    res: AnyResponse,
    extra: { errors?: Record<string, unknown> } = {},
  ): Promise<void> {
    await this.carry(req, res, extra)
    if (requestState(req).forgetIntended) this.auth.forgetIntended(req, res)

    if (redirect.external && isInertia(req)) {
      // The client performs a full page visit to the external URL.
      setHeader(res, 'X-Inertia-Location', redirect.url)
      this.host.httpAdapter.reply(res, '', 409)
      return
    }
    if (isInertia(req) && redirect.url.includes('#') && !isPrefetch(req)) {
      // XHR follows a redirect without its fragment; hand the URL to the client
      // instead, which visits it — fragment included — as a GET.
      setHeader(res, 'X-Inertia-Redirect', redirect.url)
      this.host.httpAdapter.reply(res, '', 409)
      return
    }
    this.host.httpAdapter.redirect(res, this.statusFor(req, redirect.status), redirect.url)
  }

  /** Writes whatever this request queued, on top of what it received, for the next request. */
  private async carry(req: AnyRequest, res: AnyResponse, extra: { errors?: Record<string, unknown> }): Promise<void> {
    const state = requestState(req)
    const bag = mergeBags(await this.flash.read(req), state.pending, extra)
    state.flashCarried = true
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
