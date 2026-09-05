import type { OnceMetadata, ScrollMetadata } from './props'

/** The Inertia page object sent to the client, either as JSON or embedded in the HTML shell. */
export interface PageObject {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
  deferredProps?: Record<string, string[]>
  mergeProps?: string[]
  prependProps?: string[]
  /** Per scroll prop: its cursor, and whether the client must re-sync to it. */
  scrollProps?: Record<string, ScrollMetadata & { reset: boolean }>
  /** Per once key: which prop it caches and when the client should drop it. */
  onceProps?: Record<string, OnceMetadata>
  /** Flash data for this render only; the client clears it from history. */
  flash?: Record<string, unknown>
  clearHistory?: boolean
  encryptHistory?: boolean
}

export type AssetVersion = string | (() => string | Promise<string>)

/** Helpers passed to the `template` function. */
export interface TemplateContext {
  /**
   * Script/style tags for the configured Vite entry. Returns dev-server tags
   * during development and hashed, manifest-resolved tags in production.
   * Empty string when no `vite` option is configured.
   */
  assets: () => string
  /**
   * Elements the SSR render produced for `<head>` (title, meta tags), joined into
   * a string. Empty when the page was not server-rendered.
   */
  head: () => string
  /**
   * The page body: the server-rendered markup when SSR ran, otherwise the root
   * element plus the page-object script that `viewBody(page)` produces.
   */
  body: () => string
}

export type TemplateFn = (
  page: PageObject,
  ctx: TemplateContext,
) => string | Promise<string>

/** Per-request state stored on the raw request object by the middleware. */
export interface MvcRequestState {
  shared: Record<string, unknown>
  /** Set by `ViewService.disableSsr()`/`enableSsr()`; overrides `@Ssr()` for this request. */
  ssr?: boolean
  /** Flash data and refresh keys queued during this request, for this render or the next. */
  pending: { flash?: Record<string, unknown>; refresh?: string[] }
}
