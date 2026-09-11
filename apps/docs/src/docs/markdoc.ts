import Markdoc, { type Config, type RenderableTreeNode } from '@markdoc/markdoc'

// The package is CommonJS: only the default export is reachable from ESM on Node.
const { Tag, nodes: defaultNodes } = Markdoc
type Tag = InstanceType<typeof Tag>
import { slugifyWithCounter } from '@sindresorhus/slugify'

/**
 * The Markdoc schema: what a content file may contain and what it becomes.
 * Tag names are strings; the page maps them to components on the client
 * (frontend/components/Markdown.tsx), so this file stays free of React.
 */
export function schema(): Config {
  const slugify = slugifyWithCounter()

  return {
    nodes: {
      heading: {
        ...defaultNodes.heading,
        transform(node, config) {
          const attributes = node.transformAttributes(config)
          const children = node.transformChildren(config)
          const text = children.filter((child): child is string => typeof child === 'string').join(' ')
          const id = typeof attributes.id === 'string' ? attributes.id : slugify(text)
          return new Tag(`h${node.attributes.level}`, { ...attributes, id }, children)
        },
      },
      th: {
        ...defaultNodes.th,
        attributes: { ...defaultNodes.th.attributes, scope: { type: String, default: 'col' } },
      },
      fence: {
        render: 'Fence',
        attributes: { language: { type: String }, content: { type: String } },
        transform(node, config) {
          const { language, content } = node.transformAttributes(config) as { language?: string; content: string }
          return new Tag('Fence', { language: language ?? 'text' }, [content])
        },
      },
    },
    tags: {
      callout: {
        render: 'Callout',
        attributes: {
          title: { type: String },
          type: { type: String, default: 'note', matches: ['note', 'warning'], errorLevel: 'critical' },
        },
      },
      figure: {
        render: 'Figure',
        selfClosing: true,
        attributes: { src: { type: String }, alt: { type: String }, caption: { type: String } },
      },
      'quick-links': { render: 'QuickLinks' },
      'quick-link': {
        render: 'QuickLink',
        selfClosing: true,
        attributes: {
          title: { type: String },
          description: { type: String },
          icon: { type: String },
          href: { type: String },
        },
      },
    },
  }
}

export interface TocEntry {
  id: string
  title: string
  children: { id: string; title: string }[]
}

/** The h2/h3 outline of a transformed document, for the "On this page" column. */
export function tableOfContents(tree: RenderableTreeNode): TocEntry[] {
  const sections: TocEntry[] = []
  walk(tree, (tag) => {
    if (tag.name !== 'h2' && tag.name !== 'h3') return
    const entry = { id: String(tag.attributes.id), title: textOf(tag.children) }
    if (tag.name === 'h2') sections.push({ ...entry, children: [] })
    else sections[sections.length - 1]?.children.push(entry)
  })
  return sections
}

/** Headings and paragraphs per section, the unit the search index stores. */
export function searchSections(source: string, pageTitle: string): { title: string; hash: string | null; content: string[] }[] {
  const ast = Markdoc.parse(source)
  const slugify = slugifyWithCounter()
  const sections: { title: string; hash: string | null; content: string[] }[] = [{ title: pageTitle, hash: null, content: [] }]
  const visit = (node: { type: string; attributes?: Record<string, unknown>; children?: unknown[] }) => {
    if (node.type === 'heading' || node.type === 'paragraph') {
      const content = astText(node).trim()
      if (node.type === 'heading' && Number(node.attributes?.level) <= 2) {
        sections.push({ title: content, hash: typeof node.attributes?.id === 'string' ? node.attributes.id : slugify(content), content: [] })
      } else if (content) {
        sections[sections.length - 1].content.push(content)
      }
      return
    }
    for (const child of (node.children ?? []) as typeof node[]) visit(child)
  }
  visit(ast as never)
  return sections
}

function walk(node: RenderableTreeNode, fn: (tag: Tag) => void): void {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, fn))
  if (!Tag.isTag(node)) return
  fn(node)
  node.children.forEach((child) => walk(child, fn))
}

function textOf(nodes: RenderableTreeNode[]): string {
  return nodes.map((node) => (typeof node === 'string' ? node : Tag.isTag(node) ? textOf(node.children) : '')).join('')
}

function astText(node: { type: string; attributes?: Record<string, unknown>; children?: unknown[] }): string {
  let text = node.type === 'text' && typeof node.attributes?.content === 'string' ? node.attributes.content : ''
  for (const child of (node.children ?? []) as typeof node[]) text += astText(child)
  return text
}
