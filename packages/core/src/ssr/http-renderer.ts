import type { PageObject } from '../protocol/types'
import { DEFAULT_SSR_TIMEOUT, DEFAULT_SSR_URL, type SsrError, type SsrRenderer, type SsrResult } from './types'

/** Turns the SSR server's JSON error body into our classified shape. */
function toSsrError(body: unknown, fallback: string): SsrError {
  if (typeof body === 'object' && body !== null) {
    const payload = body as Record<string, unknown>
    const type = payload.type
    return {
      message: typeof payload.error === 'string' ? payload.error : fallback,
      type:
        type === 'browser-api' || type === 'component-resolution' || type === 'render'
          ? type
          : 'unknown',
      component: typeof payload.component === 'string' ? payload.component : undefined,
      url: typeof payload.url === 'string' ? payload.url : undefined,
      hint: typeof payload.hint === 'string' ? payload.hint : undefined,
      stack: typeof payload.stack === 'string' ? payload.stack : undefined,
      sourceLocation: typeof payload.sourceLocation === 'string' ? payload.sourceLocation : undefined,
      browserApi: typeof payload.browserApi === 'string' ? payload.browserApi : undefined,
    }
  }
  return { message: fallback, type: 'unknown' }
}

export class SsrHttpError extends Error {
  constructor(readonly detail: SsrError) {
    super(detail.message)
    this.name = 'SsrHttpError'
  }
}

/**
 * Posts the page object to Inertia's Node SSR server, the production path.
 * Used when no in-process renderer is available.
 */
export class HttpSsrRenderer implements SsrRenderer {
  constructor(
    private readonly url: string = DEFAULT_SSR_URL,
    private readonly timeout: number = DEFAULT_SSR_TIMEOUT,
  ) {}

  async render(page: PageObject): Promise<SsrResult> {
    let response: Response
    try {
      response = await fetch(`${this.url.replace(/\/$/, '')}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page),
        signal: AbortSignal.timeout(this.timeout),
      })
    } catch (cause) {
      // Server down, refused, or timed out — distinct from a render that threw.
      throw new SsrHttpError({
        message: `Could not reach the SSR server at ${this.url}: ${(cause as Error).message}`,
        type: 'connection',
        component: page.component,
        url: page.url,
        hint: 'Start it with your SSR bundle, or disable SSR for this route.',
      })
    }

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) throw new SsrHttpError(toSsrError(body, `SSR server responded ${response.status}`))

    const result = body as Partial<SsrResult> | null
    if (!result || typeof result.body !== 'string') {
      throw new SsrHttpError({
        message: 'SSR server returned no body markup',
        type: 'render',
        component: page.component,
      })
    }

    return { head: Array.isArray(result.head) ? result.head : [], body: result.body }
  }

  /** Used to skip rendering when the server is not running. */
  async healthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(1_000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
