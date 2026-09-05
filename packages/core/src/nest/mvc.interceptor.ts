import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, from, mergeMap } from 'rxjs'
import {
  HEADER_EXCEPT_ONCE_PROPS,
  HEADER_MERGE_INTENT,
  HEADER_PARTIAL_COMPONENT,
  HEADER_PARTIAL_DATA,
  HEADER_PARTIAL_EXCEPT,
  HEADER_RESET,
} from '../protocol/constants'
import { defaultTemplate, viewBody } from '../protocol/html'
import { PartialReload, always, resolveProps } from '../protocol/props'
import type { PageObject, TemplateContext } from '../protocol/types'
import type { MvcModuleOptions } from './types'
import { resolveVersion } from '../protocol/version'
import type { FlashStore } from './flash'
import {
  type AnyRequest,
  type AnyResponse,
  appendVary,
  header,
  isInertia,
  requestMethod,
  requestPath,
  requestState,
  requestUrl,
  setHeader,
} from './http'
import {
  MVC_ASSETS,
  MVC_FLASH_STORE,
  MVC_MODULE_OPTIONS,
  MVC_SSR_METADATA,
  MVC_VIEW_METADATA,
} from './tokens'
import { SsrService } from './ssr.service'
import type { ViteAssets } from './vite'

const splitHeader = (value: string | undefined): string[] =>
  value !== undefined && value.length > 0 ? value.split(',').map((s) => s.trim()) : []

@Injectable()
export class MvcInterceptor implements NestInterceptor {
  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional() @Inject(MVC_ASSETS) private readonly assets: ViteAssets | null,
    @Optional() @Inject(SsrService) private readonly ssr: SsrService | null,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
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

    return next
      .handle()
      .pipe(
        mergeMap((props) =>
          from(this.render(component, (props ?? {}) as Record<string, unknown>, req, res, ssrDecorator)),
        ),
      )
  }

  private async render(
    component: string,
    raw: Record<string, unknown>,
    req: AnyRequest,
    res: AnyResponse,
    ssrDecorator?: boolean,
  ): Promise<unknown> {
    const inertia = isInertia(req)
    const partial = this.detectPartial(req, component)
    const state = requestState(req)

    // What the previous request left for this client, plus what this request
    // queued. Consumed by this render: the store is cleared below, so nothing is
    // kept between requests on the server.
    const bag = (await this.flash.read(req)) ?? {}
    const flash = { ...bag.flash, ...state.pending.flash }
    const refreshOnce = [...(bag.refresh ?? []), ...(state.pending.refresh ?? [])]

    const { props, deferredProps, mergeProps, prependProps, scrollProps, onceProps } = await resolveProps(
      { errors: always(bag.errors ?? {}), ...state.shared, ...raw },
      partial,
      {
        reset: splitHeader(header(req, HEADER_RESET)),
        mergeIntent: header(req, HEADER_MERGE_INTENT) === 'prepend' ? 'prepend' : 'append',
        loadedOnce: splitHeader(header(req, HEADER_EXCEPT_ONCE_PROPS)),
        refreshOnce,
      },
    )
    await this.flash.clear(req, res)

    const page: PageObject = {
      component,
      props,
      url: requestUrl(req),
      version: await resolveVersion(this.options.version),
    }
    if (Object.keys(deferredProps).length > 0) page.deferredProps = deferredProps
    if (mergeProps.length > 0) page.mergeProps = mergeProps
    if (prependProps.length > 0) page.prependProps = prependProps
    if (Object.keys(scrollProps).length > 0) page.scrollProps = scrollProps
    if (Object.keys(onceProps).length > 0) page.onceProps = onceProps
    if (Object.keys(flash).length > 0) page.flash = flash

    appendVary(res, 'X-Inertia')

    if (inertia) {
      setHeader(res, 'X-Inertia', 'true')
      return page
    }

    setHeader(res, 'Content-Type', 'text/html; charset=utf-8')

    // SSR only applies to the initial HTML load; Inertia visits swap on the client.
    const ssr =
      (await this.ssr?.render(
        {
          path: requestPath(req),
          url: requestUrl(req),
          method: requestMethod(req),
          component,
          page,
        },
        { decorator: ssrDecorator, runtime: state.ssr },
      )) ?? null

    const ctx: TemplateContext = {
      assets: () => this.assets?.tags() ?? '',
      head: () => ssr?.head.join('\n') ?? '',
      body: () => ssr?.body ?? viewBody(page),
    }
    const html = await (this.options.template ?? defaultTemplate)(page, ctx)
    // In dev this lets Vite inject the HMR client and plugin preambles (e.g. React Refresh).
    return this.assets ? this.assets.transformHtml(requestUrl(req), html) : html
  }

  private detectPartial(req: AnyRequest, component: string): PartialReload | null {
    if (header(req, HEADER_PARTIAL_COMPONENT) !== component) return null
    const only = splitHeader(header(req, HEADER_PARTIAL_DATA))
    const except = splitHeader(header(req, HEADER_PARTIAL_EXCEPT))
    return only.length > 0 || except.length > 0 ? { only, except } : null
  }
}
