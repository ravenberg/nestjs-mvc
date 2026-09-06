import { Controller, Get, Param } from '@nestjs/common'
import { View } from 'nestjs-mvc'

const stamp = () => new Date().toISOString()

/**
 * Layouts & Head: persistent layouts, nested layouts, <Head>, layout props.
 * The server has nothing to do with layouts — a page names its component and
 * the client decides how it is framed — so these handlers only hand over the
 * props each page shows.
 */
@Controller('features/layouts')
export class LayoutsController {
  @Get('persistent/:tab')
  @View('Features/Layouts/Persistent')
  persistent(@Param('tab') tab: string) {
    const current = ['first', 'second', 'third'].includes(tab) ? tab : 'first'
    return { tab: current, renderedAt: stamp() }
  }

  @Get('nested/:section')
  @View('Features/Layouts/Nested')
  nested(@Param('section') section: string) {
    const current = ['overview', 'members', 'settings'].includes(section) ? section : 'overview'
    return { section: current, renderedAt: stamp() }
  }

  @Get('head/:slug')
  @View('Features/Layouts/Head')
  head(@Param('slug') slug: string) {
    const articles: Record<string, { title: string; summary: string }> = {
      monolith: { title: 'The monolith is back', summary: 'NestJS modules are the best modular monolith in TypeScript.' },
      'zero-api': { title: 'Zero API', summary: 'The request/response cycle is your state management.' },
    }
    const article = articles[slug] ?? articles.monolith
    return { slug: articles[slug] ? slug : 'monolith', ...article, renderedAt: stamp() }
  }

  @Get('props/:theme')
  @View('Features/Layouts/LayoutProps')
  layoutProps(@Param('theme') theme: string) {
    const current = ['light', 'dark', 'ocean'].includes(theme) ? theme : 'light'
    return { theme: current, renderedAt: stamp() }
  }
}
