import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Injectable } from '@nestjs/common'
import yaml from 'js-yaml'
import { codeToHtml } from 'shiki'

/** VS Code's One Dark Pro: decorators, JSX tags and attributes all get their own colour. */
const CODE_THEME = 'one-dark-pro'

export interface DeckSummary {
  slug: string
  title: string
  description: string | null
  slides: number
}

export interface Deck extends DeckSummary {
  /** The Markdown body; Reveal's Markdown plugin splits it into slides. */
  markdown: string
}

interface Frontmatter {
  title?: string
  description?: string
}

/**
 * One Markdown file per deck in content/decks/. Horizontal slides are
 * separated by a line with `---`, vertical ones by `--`, and a `Note:` line
 * starts the speaker notes of a slide. Files are read on every request, so
 * editing a deck and refreshing is the whole loop.
 */
@Injectable()
export class DecksService {
  private readonly root = fileURLToPath(new URL('../../content/decks/', import.meta.url))

  async list(): Promise<DeckSummary[]> {
    const slugs = readdirSync(this.root)
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''))
    const decks = await Promise.all(slugs.map((slug) => this.read(slug)))
    return decks
      .filter((deck): deck is Deck => deck !== null)
      .map(({ slug, title, description, slides }) => ({ slug, title, description, slides }))
  }

  async find(slug: string): Promise<Deck | null> {
    return /^[a-z0-9-]+$/.test(slug) ? this.read(slug) : null
  }

  private async read(slug: string): Promise<Deck | null> {
    const file = join(this.root, `${slug}.md`)
    if (!existsSync(file)) return null

    const source = readFileSync(file, 'utf8')
    const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
    const frontmatter = (match ? yaml.load(match[1]) : {}) as Frontmatter
    const markdown = await this.highlight(match ? source.slice(match[0].length) : source)

    return {
      slug,
      title: frontmatter.title ?? slug,
      description: frontmatter.description ?? null,
      slides: markdown.split(/\n---\n/).length,
      markdown,
    }
  }

  /**
   * Fenced code becomes highlighted HTML here, on the server, with Shiki's
   * TextMate grammars: the same tokens an editor shows, TSX included. The
   * Markdown plugin in the browser passes the HTML through untouched.
   */
  private async highlight(markdown: string): Promise<string> {
    const fences = [...markdown.matchAll(/```(\w*)[ \t]*(?:\{([^}]*)\})?[ \t]*\n([\s\S]*?)```/g)]
    let out = markdown
    for (const fence of fences) {
      const [block, lang, steps, code] = fence
      const html = await codeToHtml(code.trimEnd(), { lang: lang || 'text', theme: CODE_THEME })
      out = out.replace(block, steps === undefined ? html : this.withSteps(html, steps))
    }
    return out
  }

  /**
   * Line focus: ```ts {|1,9-10|13-17} steps through groups of lines, dimming
   * the rest. The first group is the initial state (empty means "all lines"),
   * every group after a `|` becomes a Reveal fragment. The page's Show
   * component reads `data-steps` and the fragments' visibility.
   */
  private withSteps(html: string, steps: string): string {
    const groups = steps.split('|').map((group) => group.trim())
    const fragments = groups
      .slice(1)
      .map(() => '<span class="fragment code-step"></span>')
      .join('')
    return `<div class="code-steps" data-steps="${groups.join('|')}">${html}${fragments}</div>`
  }
}
