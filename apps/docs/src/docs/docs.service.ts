import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Injectable, OnModuleInit } from '@nestjs/common'
import Markdoc, { type RenderableTreeNode } from '@markdoc/markdoc'
import { Document } from 'flexsearch'
import yaml from 'js-yaml'
import { navigation, type NavLink } from '../navigation'
import { schema, searchSections, tableOfContents, type TocEntry } from './markdoc'

export interface DocsPage {
  href: string
  title: string
  section: string | null
  content: RenderableTreeNode
  toc: TocEntry[]
  previous: NavLink | null
  next: NavLink | null
}

export interface SearchResult {
  url: string
  title: string
  pageTitle?: string
}

interface Frontmatter {
  title?: string
}

/**
 * Loads content files, transforms them with the Markdoc schema, and keeps the
 * search index. Files are re-read on every request in development (edit and
 * refresh) and cached in production.
 */
@Injectable()
export class DocsService implements OnModuleInit {
  private readonly root = fileURLToPath(new URL('../../content/', import.meta.url))
  private readonly cache = new Map<string, DocsPage>()
  private index!: Document

  onModuleInit() {
    this.buildIndex()
  }

  /** The page for a route, or null when there is no file for it. */
  page(href: string): DocsPage | null {
    if (process.env.NODE_ENV === 'production' && this.cache.has(href)) return this.cache.get(href)!

    const file = this.fileFor(href)
    if (!file || !existsSync(file)) return null

    const { frontmatter, body } = this.read(file)
    const content = Markdoc.transform(Markdoc.parse(body), schema())
    const links = navigation.flatMap((section) => section.links)
    const position = links.findIndex((link) => link.href === href)

    const page: DocsPage = {
      href,
      title: frontmatter.title ?? 'Untitled',
      section: navigation.find((section) => section.links.some((link) => link.href === href))?.title ?? null,
      content,
      toc: tableOfContents(content),
      previous: position > 0 ? links[position - 1] : null,
      next: position > -1 && position < links.length - 1 ? links[position + 1] : null,
    }
    this.cache.set(href, page)
    return page
  }

  search(query: string, limit = 5): SearchResult[] {
    if (!query.trim()) return []
    const hits = this.index.search(query, { limit, enrich: true }) as unknown as {
      result: { id: string; doc: { title: string; pageTitle?: string } }[]
    }[]
    return (hits[0]?.result ?? []).map((item) => ({ url: item.id, title: item.doc.title, pageTitle: item.doc.pageTitle || undefined }))
  }

  /** `/` → content/index.md, `/docs/<slug>` → content/docs/<slug>.md; anything else is not a page. */
  private fileFor(href: string): string | null {
    if (href === '/') return join(this.root, 'index.md')
    const match = /^\/docs\/([a-z0-9-]+)$/.exec(href)
    return match ? join(this.root, 'docs', `${match[1]}.md`) : null
  }

  private read(file: string): { frontmatter: Frontmatter; body: string } {
    const source = readFileSync(file, 'utf8')
    const ast = Markdoc.parse(source)
    const frontmatter = (ast.attributes.frontmatter ? yaml.load(ast.attributes.frontmatter) : {}) as Frontmatter
    return { frontmatter, body: source }
  }

  private buildIndex() {
    this.index = new Document({
      tokenize: 'full',
      document: { id: 'url', index: 'content', store: ['title', 'pageTitle'] },
      context: { resolution: 9, depth: 2, bidirectional: true },
    })
    for (const file of readdirSync(this.root, { recursive: true }) as string[]) {
      if (!file.endsWith('.md')) continue
      const href = file === 'index.md' ? '/' : `/${file.replace(/\.md$/, '')}`
      const { frontmatter, body } = this.read(join(this.root, file))
      const sections = searchSections(body, frontmatter.title ?? 'Untitled')
      for (const { title, hash, content } of sections) {
        this.index.add({
          url: href + (hash ? `#${hash}` : ''),
          title,
          content: [title, ...content].join('\n'),
          pageTitle: hash ? sections[0].title : '',
        })
      }
    }
  }
}
