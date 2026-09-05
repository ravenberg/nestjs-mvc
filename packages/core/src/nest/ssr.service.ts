import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { MVC_MODULE_OPTIONS, MVC_VITE_SERVER } from './tokens'
import { decideSsr, type SsrOptIn } from '../ssr/decide'
import { HttpSsrRenderer, SsrHttpError } from '../ssr/http-renderer'
import { ModuleSsrRenderer } from '../ssr/module-renderer'
import { ViteSsrRenderer } from '../ssr/vite-renderer'
import {
  DEFAULT_SSR_BUNDLE,
  DEFAULT_SSR_TIMEOUT,
  type SsrContext,
  type SsrError,
  type SsrRenderer,
  type SsrResult,
} from '../ssr/types'
import type { MvcModuleOptions } from './types'
import { pluginApi, type ViteDevServerHolder } from './vite'

/**
 * Runs the render for routes that opted in through `@Ssr()`, choosing the
 * transport automatically: Vite's in-process module runner in development, the
 * built bundle imported in-process in production. A failed render is never
 * fatal — it is reported and the response falls back to client-side rendering.
 */
@Injectable()
export class SsrService {
  private readonly logger = new Logger('MvcSsr')
  private httpRenderer?: HttpSsrRenderer
  private moduleRenderer?: ModuleSsrRenderer

  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Optional() @Inject(MVC_VITE_SERVER) private readonly vite: ViteDevServerHolder | null,
  ) {}

  /**
   * Returns the rendered markup, or `null` when the route did not opt in or the
   * render failed and the client should take over.
   */
  async render(context: SsrContext, optIn: SsrOptIn): Promise<SsrResult | null> {
    if (!decideSsr(optIn).render) return null

    const renderer = this.renderer()
    if (!renderer) {
      this.report(
        new Error(
          `${context.component} opted into SSR but no renderer is configured — add \`nestjsMvc()\` ` +
            'from "nestjs-mvc/vite" to vite.config.ts, set `ssr.entry`, or set `ssr.url` for a standalone server.',
        ),
        context,
      )
      return null
    }

    try {
      return await renderer.render(context.page)
    } catch (cause) {
      this.report(cause, context)
      return null
    }
  }

  /**
   * Picks the transport, preferring in-process rendering so the app stays a
   * single process:
   *  1. Vite dev server + entry (`ssr.entry`, else the one `nestjsMvc()` generates)
   *  2. `url` — explicit opt-in to a standalone SSR server
   *  3. the built bundle (`ssr.bundle`, else `dist/ssr/ssr.js`), imported in-process
   */
  private renderer(): SsrRenderer | null {
    const ssr = this.options.ssr ?? {}
    const devServer = this.vite?.server

    const entry = ssr.entry ?? pluginApi(devServer)?.ssr
    if (entry && devServer?.ssrLoadModule) {
      return new ViteSsrRenderer(devServer, entry)
    }

    if (ssr.url) {
      this.httpRenderer ??= new HttpSsrRenderer(ssr.url, ssr.timeout ?? DEFAULT_SSR_TIMEOUT)
      return this.httpRenderer
    }

    // The default bundle only applies outside development: in dev a missing entry
    // is a configuration problem, not a missing build.
    if (ssr.bundle || !devServer) {
      this.moduleRenderer ??= new ModuleSsrRenderer(ssr.bundle ?? DEFAULT_SSR_BUNDLE, this.options.vite?.root)
      return this.moduleRenderer
    }

    return null
  }

  private report(cause: unknown, context: SsrContext): void {
    const error: SsrError =
      cause instanceof SsrHttpError
        ? cause.detail
        : {
            message: cause instanceof Error ? cause.message : String(cause),
            type: 'render',
            component: context.component,
            url: context.url,
            stack: cause instanceof Error ? cause.stack : undefined,
          }

    const onError = this.options.ssr?.onError
    if (onError) {
      onError(error)
      return
    }

    this.logger.warn(
      `SSR failed for ${error.component ?? context.component} at ${error.url ?? context.url}: ${error.message}` +
        (error.hint ? ` — ${error.hint}` : '') +
        ' (falling back to client-side rendering)',
    )
  }
}
