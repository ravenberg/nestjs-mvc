import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common'
import { Ssr, View } from 'nestjs-mvc'
import { DocsService } from './docs.service'

/** Every docs route renders on the server: the pages are indexable and readable without JavaScript. */
@Controller()
@Ssr()
export class DocsController {
  constructor(@Inject(DocsService) private readonly docs: DocsService) {}

  @Get('/')
  @View('Docs/Page')
  home() {
    return this.page('/')
  }

  @Get('docs/:slug')
  @View('Docs/Page')
  doc(@Param('slug') slug: string) {
    return this.page(`/docs/${slug}`)
  }

  /** JSON for the search dialog; not a page, so no @View(). */
  @Get('search')
  search(@Query('q') q = '') {
    return { results: this.docs.search(q) }
  }

  private page(href: string) {
    const page = this.docs.page(href)
    if (!page) throw new NotFoundException(`No documentation page at ${href}`)
    return page
  }
}
