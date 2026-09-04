/** The Inertia page object sent to the client, either as JSON or embedded in the HTML shell. */
export interface PageObject {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
  deferredProps?: Record<string, string[]>
  mergeProps?: string[]
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
}

export type TemplateFn = (
  page: PageObject,
  ctx: TemplateContext,
) => string | Promise<string>

/** Per-request state stored on the request object by the middleware. */
export interface MvcRequestState {
  shared: Record<string, unknown>
}
