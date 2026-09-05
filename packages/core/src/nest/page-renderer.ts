import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
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
import { SsrService } from './ssr.service'
import { MVC_ASSETS, MVC_FLASH_STORE, MVC_MODULE_OPTIONS } from './tokens'
import type { MvcModuleOptions } from './types'
import type { ViteAssets } from './vite'

const splitHeader = (value: string | undefined): string[] =>
  value !== undefined && value.length > 0 ? value.split(',').map((s) => s.trim()) : []

export interface RenderOptions {
  /** `@Ssr()` on the handler or controller, when rendering for a route. */
  ssrDecorator?: boolean
  /** `@EncryptHistory()` on the handler or controller, when rendering for a route. */
  encryptHistoryDecorator?: boolean
  /** Whether the props shared for this request (middleware, `ViewService.share()`) are included. Default `true`. */
  shared?: boolean
}

/** What a render produced: the page object for an Inertia visit, else the HTML shell. */
export type Rendered = { kind: 'json'; page: PageObject } | { kind: 'html'; html: string }

/**
 * Turns a component and its raw props into the response body: the page object
 * for an Inertia visit, the HTML shell (server-rendered or not) for a first
 * load. Used by the page interceptor for `@View()` handlers and by the
 * exception filter for error pages, so both go through exactly the same
 * resolution: partial reloads, flash, once, scroll, shared props, SSR.
 */
@Injectable()
export class PageRenderer {
  private readonly logger = new Logger('MvcProps')

  constructor(
    @Inject(MVC_MODULE_OPTIONS) private readonly options: MvcModuleOptions,
    @Optional() @Inject(MVC_ASSETS) private readonly assets: ViteAssets | null,
    @Optional() @Inject(SsrService) private readonly ssr: SsrService | null,
    @Inject(MVC_FLASH_STORE) private readonly flash: FlashStore,
  ) {}

  async render(
    component: string,
    raw: Record<string, unknown>,
    req: AnyRequest,
    res: AnyResponse,
    options: RenderOptions = {},
  ): Promise<Rendered> {
    const partial = this.detectPartial(req, component)
    const state = requestState(req)

    // What the previous request left for this client, plus what this request
    // queued. Consumed by this render: the store is cleared below, so nothing is
    // kept between requests on the server.
    const bag = (await this.flash.read(req)) ?? {}
    const flash = { ...bag.flash, ...state.pending.flash }
    const refreshOnce = [...(bag.refresh ?? []), ...(state.pending.refresh ?? [])]

    const {
      props,
      deferredProps,
      mergeProps,
      prependProps,
      deepMergeProps,
      matchPropsOn,
      scrollProps,
      onceProps,
      rescuedProps,
    } = await resolveProps(
      { errors: always(bag.errors ?? {}), ...(options.shared === false ? {} : state.shared), ...raw },
      partial,
      {
        reset: splitHeader(header(req, HEADER_RESET)),
        mergeIntent: header(req, HEADER_MERGE_INTENT) === 'prepend' ? 'prepend' : 'append',
        loadedOnce: splitHeader(header(req, HEADER_EXCEPT_ONCE_PROPS)),
        refreshOnce,
        onRescue:
          this.options.onRescue ??
          ((error, path) =>
            this.logger.warn(
              `Deferred prop "${path}" on ${component} failed and was left out: ${(error as Error)?.message ?? error}`,
            )),
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
    if (deepMergeProps.length > 0) page.deepMergeProps = deepMergeProps
    if (matchPropsOn.length > 0) page.matchPropsOn = matchPropsOn
    if (Object.keys(scrollProps).length > 0) page.scrollProps = scrollProps
    if (Object.keys(onceProps).length > 0) page.onceProps = onceProps
    if (Object.keys(flash).length > 0) page.flash = flash
    if (rescuedProps.length > 0) page.rescuedProps = rescuedProps
    // Both are booleans the client only needs when true. Precedence for
    // encryption: runtime → decorator → module default.
    if (state.encryptHistory ?? options.encryptHistoryDecorator ?? this.options.history?.encrypt ?? false) {
      page.encryptHistory = true
    }
    if (bag.clearHistory || state.pending.clearHistory) page.clearHistory = true
    if (bag.preserveFragment || state.pending.preserveFragment) page.preserveFragment = true
    // Which top-level props came from sharing: the client carries those into the
    // placeholder page of an instant visit, so the layout does not flicker.
    const sharedKeys = options.shared === false ? [] : Object.keys(state.shared).map((key) => key.split('.')[0])
    if (sharedKeys.length > 0 && (this.options.exposeSharedProps ?? true)) page.sharedProps = [...new Set(sharedKeys)]

    appendVary(res, 'X-Inertia')

    if (isInertia(req)) {
      setHeader(res, 'X-Inertia', 'true')
      return { kind: 'json', page }
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
        { decorator: options.ssrDecorator, runtime: state.ssr },
      )) ?? null

    const ctx: TemplateContext = {
      assets: () => this.assets?.tags() ?? '',
      head: () => ssr?.head.join('\n') ?? '',
      body: () => ssr?.body ?? viewBody(page),
    }
    const html = await (this.options.template ?? defaultTemplate)(page, ctx)
    // In dev this lets Vite inject the HMR client and plugin preambles (e.g. React Refresh).
    return { kind: 'html', html: this.assets ? await this.assets.transformHtml(requestUrl(req), html) : html }
  }

  private detectPartial(req: AnyRequest, component: string): PartialReload | null {
    if (header(req, HEADER_PARTIAL_COMPONENT) !== component) return null
    const only = splitHeader(header(req, HEADER_PARTIAL_DATA))
    const except = splitHeader(header(req, HEADER_PARTIAL_EXCEPT))
    return only.length > 0 || except.length > 0 ? { only, except } : null
  }
}
