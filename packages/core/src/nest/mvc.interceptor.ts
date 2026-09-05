import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request, Response } from 'express'
import { Observable, from, mergeMap } from 'rxjs'
import {
  ERRORS_COOKIE,
  HEADER_INERTIA,
  HEADER_PARTIAL_COMPONENT,
  HEADER_PARTIAL_DATA,
  HEADER_PARTIAL_EXCEPT,
  HEADER_RESET,
} from '../protocol/constants'
import { defaultTemplate, viewBody } from '../protocol/html'
import { PartialReload, always, resolveProps } from '../protocol/props'
import type { PageObject, MvcRequestState, TemplateContext } from '../protocol/types'
import type { MvcModuleOptions } from './types'
import { resolveVersion } from '../protocol/version'
import { MVC_ASSETS, MVC_MODULE_OPTIONS, MVC_REQUEST_STATE, MVC_SSR_METADATA, MVC_VIEW_METADATA } from './tokens'
import { SsrService } from './ssr.service'
import type { ViteAssets } from './vite'

const splitHeader = (value: string | string[] | undefined): string[] =>
  typeof value === 'string' && value.length > 0 ? value.split(',').map((s) => s.trim()) : []

const readCookie = (header: string | undefined, name: string): string | undefined => {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

@Injectable()
export class MvcInterceptor implements NestInterceptor {
  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional() @Inject(MVC_ASSETS) private readonly assets: ViteAssets | null,
    @Optional() @Inject(SsrService) private readonly ssr: SsrService | null,
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
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()

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
    req: Request,
    res: Response,
    ssrDecorator?: boolean,
  ): Promise<unknown> {
    const isInertia = req.headers[HEADER_INERTIA] === 'true'
    const partial = this.detectPartial(req, component)
    const reset = splitHeader(req.headers[HEADER_RESET])
    const state = (req as Request & Record<symbol, MvcRequestState | undefined>)[MVC_REQUEST_STATE]

    const { props, deferredProps, mergeProps } = await resolveProps(
      { errors: always(this.consumeErrors(req, res)), ...state?.shared, ...raw },
      partial,
      reset,
    )

    const page: PageObject = {
      component,
      props,
      url: req.originalUrl ?? req.url,
      version: await resolveVersion(this.options.version),
    }
    if (Object.keys(deferredProps).length > 0) page.deferredProps = deferredProps
    if (mergeProps.length > 0) page.mergeProps = mergeProps

    res.setHeader('Vary', 'X-Inertia')

    if (isInertia) {
      res.setHeader('X-Inertia', 'true')
      return page
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')

    // SSR only applies to the initial HTML load; Inertia visits swap on the client.
    const ssr =
      (await this.ssr?.render(
        {
          path: req.path,
          url: req.originalUrl ?? req.url,
          method: req.method,
          component,
          page,
        },
        { decorator: ssrDecorator, runtime: state?.ssr },
      )) ?? null

    const ctx: TemplateContext = {
      assets: () => this.assets?.tags() ?? '',
      head: () => ssr?.head.join('\n') ?? '',
      body: () => ssr?.body ?? viewBody(page),
    }
    const html = await (this.options.template ?? defaultTemplate)(page, ctx)
    // In dev this lets Vite inject the HMR client and plugin preambles (e.g. React Refresh).
    return this.assets ? this.assets.transformHtml(req.originalUrl ?? req.url, html) : html
  }

  /** Reads and clears validation errors flashed by the MvcExceptionFilter. */
  private consumeErrors(req: Request, res: Response): Record<string, unknown> {
    const raw = readCookie(req.headers.cookie, ERRORS_COOKIE)
    if (raw === undefined) return {}
    res.clearCookie(ERRORS_COOKIE, { path: '/' })
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw))
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  private detectPartial(req: Request, component: string): PartialReload | null {
    if (req.headers[HEADER_PARTIAL_COMPONENT] !== component) return null
    const only = splitHeader(req.headers[HEADER_PARTIAL_DATA])
    const except = splitHeader(req.headers[HEADER_PARTIAL_EXCEPT])
    return only.length > 0 || except.length > 0 ? { only, except } : null
  }
}
