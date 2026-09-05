import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, from, mergeMap } from 'rxjs'
import { type AnyRequest, type AnyResponse } from './http'
import { PageRenderer } from './page-renderer'
import { MVC_SSR_METADATA, MVC_VIEW_METADATA } from './tokens'

/**
 * Turns the plain object a `@View()` handler returns into the page response,
 * through the shared `PageRenderer`. Handlers without `@View()` are untouched.
 */
@Injectable()
export class MvcInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PageRenderer) private readonly renderer: PageRenderer,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const component = this.reflector.get<string | undefined>(MVC_VIEW_METADATA, context.getHandler())
    if (!component) return next.handle()

    // `@Ssr()` on the handler wins over `@Ssr()` on the controller.
    const ssrDecorator = this.reflector.getAllAndOverride<boolean | undefined>(MVC_SSR_METADATA, [
      context.getHandler(),
      context.getClass(),
    ])
    const http = context.switchToHttp()
    const req = http.getRequest<AnyRequest>()
    const res = http.getResponse<AnyResponse>()

    return next.handle().pipe(
      mergeMap((props) =>
        from(
          this.renderer
            .render(component, (props ?? {}) as Record<string, unknown>, req, res, { ssrDecorator })
            .then((rendered) => (rendered.kind === 'json' ? rendered.page : rendered.html)),
        ),
      ),
    )
  }
}
