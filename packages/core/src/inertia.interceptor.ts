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
  INERTIA_ASSETS,
  INERTIA_COMPONENT_METADATA,
  INERTIA_MODULE_OPTIONS,
  INERTIA_REQUEST_STATE,
} from './constants'
import { defaultTemplate } from './html'
import { PartialReload, always, resolveProps } from './props'
import type { InertiaModuleOptions, InertiaPage, InertiaRequestState } from './types'
import type { InertiaAssets } from './vite'
import { resolveVersion } from './version'

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
export class InertiaInterceptor implements NestInterceptor {
  constructor(
    @Inject(INERTIA_MODULE_OPTIONS) private readonly options: InertiaModuleOptions,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Optional() @Inject(INERTIA_ASSETS) private readonly assets: InertiaAssets | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const component = this.reflector.get<string | undefined>(INERTIA_COMPONENT_METADATA, context.getHandler())
    if (!component) return next.handle()

    const http = context.switchToHttp()
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()

    return next
      .handle()
      .pipe(mergeMap((props) => from(this.render(component, (props ?? {}) as Record<string, unknown>, req, res))))
  }

  private async render(
    component: string,
    raw: Record<string, unknown>,
    req: Request,
    res: Response,
  ): Promise<unknown> {
    const isInertia = req.headers[HEADER_INERTIA] === 'true'
    const partial = this.detectPartial(req, component)
    const reset = splitHeader(req.headers[HEADER_RESET])
    const state = (req as Request & Record<symbol, InertiaRequestState | undefined>)[INERTIA_REQUEST_STATE]

    const { props, deferredProps, mergeProps } = await resolveProps(
      { errors: always(this.consumeErrors(req, res)), ...state?.shared, ...raw },
      partial,
      reset,
    )

    const page: InertiaPage = {
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
    const ctx = { assets: () => this.assets?.tags() ?? '' }
    const html = await (this.options.template ?? defaultTemplate)(page, ctx)
    // In dev this lets Vite inject the HMR client and plugin preambles (e.g. React Refresh).
    return this.assets ? this.assets.transformHtml(req.originalUrl ?? req.url, html) : html
  }

  /** Reads and clears validation errors flashed by the InertiaExceptionFilter. */
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
