import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Markdoc, { type Node, type RenderableTreeNode } from '@markdoc/markdoc'
import { schema } from '../src/docs/markdoc'
import { navigation } from '../src/navigation'

/**
 * Checks the content before anyone reads it: every page is in the navigation
 * and valid Markdoc, links point at pages and at headings that exist, prose
 * has no dashes as punctuation, every page example exists in React and in
 * Vue, and prose that names one framework only shows for that framework.
 *
 *   pnpm --filter docs check
 */
const root = fileURLToPath(new URL('../content/', import.meta.url))
const hrefs = navigation.flatMap((section) => section.links.map((link) => link.href))
const fileFor = (href: string) => (href === '/' ? join(root, 'index.md') : join(root, 'docs', `${href.replace(/^\/docs\//, '')}.md`))
const problems: string[] = []

for (const href of hrefs) if (!existsSync(fileFor(href))) problems.push(`navigation links to ${href}, which has no file`)

const files = ['index.md', ...readdirSync(join(root, 'docs')).map((file) => `docs/${file}`)]

// The heading ids of every page, as the site renders them, for links with a #fragment.
const hrefOf = (file: string) => (file === 'index.md' ? '/' : `/${file.replace(/\.md$/, '')}`)
const headingIds = new Map<string, Set<string>>()
for (const file of files) {
  const tree = Markdoc.transform(Markdoc.parse(readFileSync(join(root, file), 'utf8')), schema())
  const ids = new Set<string>()
  const collect = (node: RenderableTreeNode) => {
    if (!Markdoc.Tag.isTag(node)) return
    if (/^h[1-6]$/.test(node.name) && typeof node.attributes.id === 'string') ids.add(node.attributes.id)
    node.children.forEach(collect)
  }
  collect(tree)
  headingIds.set(hrefOf(file), ids)
}

for (const file of files) {
  const href = file === 'index.md' ? '/' : `/${file.replace(/\.md$/, '')}`
  if (!hrefs.includes(href)) problems.push(`${file}: not in the navigation`)

  const source = readFileSync(join(root, file), 'utf8')
  const ast = Markdoc.parse(source)
  for (const { lines, error } of Markdoc.validate(ast, schema())) problems.push(`${file}:${lines[0] ?? '?'}: ${error.message}`)

  for (const [, link, fragment] of source.matchAll(/\]\((\/[^)#\s]*)(?:#([^)\s]+))?\)/g)) {
    if (link !== '/' && !hrefs.includes(link)) problems.push(`${file}: broken link ${link}`)
    else if (fragment && !headingIds.get(link)?.has(fragment)) problems.push(`${file}: no heading #${fragment} on ${link}`)
  }

  // Prose only: not inside fences, not tag lines, not the frontmatter.
  let inFence = false
  source.split('\n').forEach((line, index) => {
    if (line.startsWith('```')) inFence = !inFence
    else if (!inFence && !line.startsWith('{%') && /( — | – | - |—|–)/.test(line) && index > 2) {
      problems.push(`${file}:${index + 1}: a dash used as punctuation: ${line.trim().slice(0, 80)}`)
    }
  })

  // Prose that names one framework must sit in that framework's block or inline
  // variant, unless the sentence names both ("React or Vue").
  let block: string | null = null
  let fence = false
  source.split('\n').forEach((line, index) => {
    if (line.startsWith('```')) {
      fence = !fence
      return
    }
    if (fence) return
    const opening = /^\{% framework name="(react|vue)" %\}$/.exec(line.trim())
    if (opening) {
      block = opening[1]
      return
    }
    if (line.trim() === '{% /framework %}') {
      block = null
      return
    }
    const outside = line.replace(/\{% framework name="(react|vue)" %\}.*?\{% \/framework %\}/g, '')
    const namesBoth = /React/.test(outside) && /Vue/.test(outside)
    if (block !== 'react' && !namesBoth && /\.tsx\b|nestjs-mvc\/react|\bJSX\b|className|`children`/.test(outside)) {
      problems.push(`${file}:${index + 1}: React-only wording outside a react variant: ${line.trim().slice(0, 80)}`)
    }
    if (block !== 'vue' && !namesBoth && /\.vue\b|nestjs-mvc\/vue|v-model|<slot|#fallback|cache-for|preserve-scroll/.test(outside)) {
      problems.push(`${file}:${index + 1}: Vue-only wording outside a vue variant: ${line.trim().slice(0, 80)}`)
    }
  })

  walk(ast, null, (node, parentTag) => {
    const language = node.type === 'fence' ? String(node.attributes.language ?? '') : ''
    if (['tsx', 'jsx', 'vue'].includes(language) && parentTag?.tag !== 'framework-code') {
      problems.push(`${file}:${node.lines[0] + 1}: a ${language} example outside {% framework-code %}; pages need a React and a Vue version`)
    }
    if (node.type === 'tag' && node.tag === 'framework-code') {
      const languages = node.children.filter((child) => child.type === 'fence').map((child) => String(child.attributes.language))
      if (languages.join(',') !== 'tsx,vue') {
        problems.push(`${file}:${node.lines[0] + 1}: {% framework-code %} needs a tsx fence, then a vue fence (found ${languages.join(', ') || 'none'})`)
      }
    }
    if (node.type === 'heading' && parentTag && ['framework', 'framework-code'].includes(parentTag.tag ?? '')) {
      problems.push(`${file}:${node.lines[0] + 1}: a heading inside {% ${parentTag.tag} %} would appear twice in "On this page"`)
    }
  })
}

function walk(node: Node, parentTag: Node | null, visit: (node: Node, parentTag: Node | null) => void): void {
  visit(node, parentTag)
  const nextParent = node.type === 'tag' ? node : parentTag
  for (const child of node.children) walk(child, nextParent, visit)
}

for (const problem of problems) console.log(problem)
console.log(`${files.length} files, ${hrefs.length} navigation entries, ${problems.length} problems`)
process.exit(problems.length ? 1 : 0)
