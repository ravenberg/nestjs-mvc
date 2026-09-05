import type { PageObject } from '../protocol/types'
import type { SsrRenderer, SsrResult } from './types'

/** Structural subset of Vite's dev server needed for SSR. */
export interface ViteSsrHost {
  ssrLoadModule: (url: string) => Promise<Record<string, unknown>>
  ssrFixStacktrace?: (error: Error) => void
}

type RenderFn = (page: PageObject) => SsrResult | Promise<SsrResult>

/**
 * Renders through Vite's module runner inside this process, so development needs
 * no separate SSR server and picks up edits immediately. Production imports the
 * built bundle through `ModuleSsrRenderer` instead.
 */
export class ViteSsrRenderer implements SsrRenderer {
  constructor(
    private readonly vite: ViteSsrHost,
    private readonly entry: string,
  ) {}

  async render(page: PageObject): Promise<SsrResult> {
    // A file path is served root-relative; a virtual id (generated entry) is loaded as-is.
    const url = this.entry.startsWith('/') || this.entry.startsWith('virtual:') ? this.entry : `/${this.entry}`

    let module: Record<string, unknown>
    try {
      module = await this.vite.ssrLoadModule(url)
    } catch (cause) {
      this.vite.ssrFixStacktrace?.(cause as Error)
      throw new Error(`[nestjs-mvc] Could not load the SSR entry "${this.entry}": ${(cause as Error).message}`, {
        cause,
      })
    }

    const render = (module.default ?? module.render) as RenderFn | undefined
    if (typeof render !== 'function') {
      throw new Error(
        `[nestjs-mvc] The SSR entry "${this.entry}" must default-export a function taking the page object.`,
      )
    }

    try {
      const result = await render(page)
      if (!result || typeof result.body !== 'string') {
        throw new Error('SSR entry returned no body markup')
      }
      return { head: Array.isArray(result.head) ? result.head : [], body: result.body }
    } catch (cause) {
      // Rewrites the stack to point at your source rather than the transformed module.
      this.vite.ssrFixStacktrace?.(cause as Error)
      throw cause
    }
  }
}
