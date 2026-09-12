import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, from, mergeMap } from 'rxjs'
import { resolveVersion } from '../protocol/version'
import { MvcAuth } from './auth'
import {
  type AnyRequest,
  type AnyResponse,
  isInertia,
  previousUrl,
  requestMethod,
  requestState,
  requestUrl,
  setHeader,
} from './http'
import { PageRenderer } from './page-renderer'
import { MvcRedirect } from './redirect'
import { MVC_ENCRYPT_HISTORY_METADATA, MVC_MODULE_OPTIONS, MVC_SSR_METADATA, MVC_VIEW_METADATA } from './tokens'
import type { MvcModuleOptions } from './types'

/**
 * Turns the plain object a `@View()` handler returns into the page response,
 * through the shared `PageRenderer`. Handlers without `@View()` render
 * nothing, but every Inertia request, whatever its handler, is first checked
 * against the user its page was rendered for.
 */
@Injectable()
export class MvcInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PageRenderer) private readonly renderer: PageRenderer,
    @Inject(MvcAuth) private readonly auth: MvcAuth,
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp()
    const req = http.getRequest<AnyRequest>()
    const res = http.getResponse<AnyResponse>()
    const component = this.reflector.get<string | undefined>(MVC_VIEW_METADATA, context.getHandler())

    return from(this.resetIfStale(req, res)).pipe(
      mergeMap(() => (component ? this.render(context, next, component, req, res) : next.handle())),
    )
  }

  /**
   * The page this request comes from was rendered for someone other than
   * whoever is logged in now — a login, a logout, a switch of user, in this
   * tab or another. The client still holds that user's once props, prefetch
   * cache and component state, so it gets one full page load instead of an
   * answer, before the handler runs: a GET loads the page it asked for, a
   * mutation goes back to its page and is not carried out for the new user.
   * The load that follows clears history (it rides the flash bag).
   */
  private async resetIfStale(req: AnyRequest, res: AnyResponse): Promise<void> {
    if (!isInertia(req)) return
    const asset = await resolveVersion(this.options.version)
    if (!this.auth.pageIsStale(req, asset)) return

    requestState(req).pending.clearHistory = true
    // The version the page will have, so a background request (polling, a
    // deferred prop) leaves the reload to the user's next visit, as the client
    // does after a deploy.
    const version = this.auth.pageVersion(req, asset)
    if (version !== null) setHeader(res, 'X-Inertia-Version', version)
    const target = requestMethod(req) === 'GET' ? requestUrl(req) : previousUrl(req, '/', this.options.url)
    throw new MvcRedirect(target, undefined, true)
  }

  private render(
    context: ExecutionContext,
    next: CallHandler,
    component: string,
    req: AnyRequest,
    res: AnyResponse,
  ): Observable<unknown> {
    // `@Ssr()` on the handler wins over `@Ssr()` on the controller.
    const ssrDecorator = this.reflector.getAllAndOverride<boolean | undefined>(MVC_SSR_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    const encryptHistoryDecorator = this.reflector.getAllAndOverride<boolean | undefined>(
      MVC_ENCRYPT_HISTORY_METADATA,
      [context.getHandler(), context.getClass()],
    )
    return next.handle().pipe(
      mergeMap((props) =>
        from(
          this.renderer
            .render(component, (props ?? {}) as Record<string, unknown>, req, res, { ssrDecorator, encryptHistoryDecorator })
            .then((rendered) => (rendered.kind === 'json' ? rendered.page : rendered.html)),
        ),
      ),
    )
  }
}
