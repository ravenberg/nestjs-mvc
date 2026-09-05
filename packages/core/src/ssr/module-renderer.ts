import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PageObject } from '../protocol/types'
import type { SsrRenderer, SsrResult } from './types'

type RenderFn = (page: PageObject) => SsrResult | Promise<SsrResult>

/**
 * Runs the built SSR bundle inside this process by importing it directly.
 *
 * Inertia's reference adapter posts the page object to a separate Node server
 * because PHP cannot execute JavaScript. NestJS already runs on Node, so that hop
 * buys nothing — one process serves the app and renders it. `HttpSsrRenderer`
 * stays available for anyone who deliberately wants SSR on its own service.
 */
export class ModuleSsrRenderer implements SsrRenderer {
  private renderFn?: RenderFn

  constructor(
    private readonly bundle: string,
    private readonly root: string = process.cwd(),
  ) {}

  async render(page: PageObject): Promise<SsrResult> {
    const render = (this.renderFn ??= await this.load())
    const result = await render(page)

    if (!result || typeof result.body !== 'string') {
      throw new Error('[nestjs-mvc] The SSR bundle returned no body markup')
    }
    return { head: Array.isArray(result.head) ? result.head : [], body: result.body }
  }

  private async load(): Promise<RenderFn> {
    const path = isAbsolute(this.bundle) ? this.bundle : resolve(this.root, this.bundle)

    let module: Record<string, unknown>
    try {
      // Node caches this, so the bundle is evaluated once per process.
      module = (await import(pathToFileURL(path).href)) as Record<string, unknown>
    } catch (cause) {
      throw new Error(
        `[nestjs-mvc] Could not load the SSR bundle at ${path}. Build it first ` +
          '(e.g. `vite build --ssr`) or point `ssr.bundle` at the right file.',
        { cause },
      )
    }

    const render = (module.default ?? module.render) as RenderFn | undefined
    if (typeof render !== 'function') {
      throw new Error(
        `[nestjs-mvc] The SSR bundle at ${path} must default-export a function taking the page object.`,
      )
    }
    return render
  }
}
