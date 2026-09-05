/** Why a page was or was not server-rendered — surfaced for debugging and tests. */
export type SsrDecision = { render: boolean; reason: 'runtime' | 'decorator' | 'default' }

/** The two places a route can opt into (or out of) SSR. */
export interface SsrOptIn {
  /** From `@Ssr()` on the handler or its controller; the handler wins. */
  decorator?: boolean
  /** From `ViewService.enableSsr()` / `disableSsr()` during the request. */
  runtime?: boolean
}

/**
 * SSR is opt-in per route. Nothing is server-rendered unless a route asks for it,
 * so a codebase without `@Ssr()` never renders on the server, whatever else is
 * configured. Precedence, most specific first:
 *
 *  1. runtime — `ViewService.enableSsr()` / `disableSsr()`, e.g. from a guard
 *  2. decorator — `@Ssr()` / `@Ssr(false)` on the handler, else on the controller
 *  3. default — off
 */
export function decideSsr({ decorator, runtime }: SsrOptIn): SsrDecision {
  if (runtime !== undefined) return { render: runtime, reason: 'runtime' }
  if (decorator !== undefined) return { render: decorator, reason: 'decorator' }
  return { render: false, reason: 'default' }
}
