/** The Inertia page object sent to the client, either as JSON or embedded in the HTML shell. */
export interface InertiaPage {
  component: string
  props: Record<string, unknown>
  url: string
  version: string | null
  deferredProps?: Record<string, string[]>
  mergeProps?: string[]
  clearHistory?: boolean
  encryptHistory?: boolean
}

export type InertiaVersion = string | (() => string | Promise<string>)

export interface InertiaModuleOptions {
  /**
   * Asset version used for cache busting. When the client's version differs,
   * Inertia forces a full page visit (409 + X-Inertia-Location).
   * Typically a hash of your build manifest.
   */
  version?: InertiaVersion
  /**
   * Renders the HTML shell for the initial (non-Inertia) page load.
   * Use `inertiaBody(page)` to render the root element. Defaults to a minimal document.
   */
  template?: (page: InertiaPage) => string | Promise<string>
}

/** Per-request state stored on the request object by the middleware. */
export interface InertiaRequestState {
  shared: Record<string, unknown>
}
