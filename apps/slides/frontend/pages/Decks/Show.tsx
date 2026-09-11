import { Head } from 'nestjs-mvc/react'
import { useEffect, useRef } from 'react'
import Reveal from 'reveal.js'
import Markdown from 'reveal.js/plugin/markdown'
import Notes from 'reveal.js/plugin/notes'
import 'reveal.js/reveal.css'
import '../../deck.css'

interface Deck {
  slug: string
  title: string
  markdown: string
}

/** Which lines a `{1,9-10}` group names; an empty group means every line. */
function linesIn(group: string): Set<number> | null {
  if (!group) return null
  const lines = new Set<number>()
  for (const part of group.split(',')) {
    const [from, to = from] = part.trim().split('-').map(Number)
    for (let line = from; line <= to; line++) lines.add(line)
  }
  return lines
}

/**
 * Applies the current step of every stepped code block: the number of visible
 * fragments picks the group, lines outside it get `.dim`.
 */
function focusLines(root: HTMLElement) {
  for (const block of Array.from(root.querySelectorAll('.code-steps'))) {
    const groups = ((block as HTMLElement).dataset.steps ?? '').split('|')
    const step = block.querySelectorAll('.code-step.visible').length
    const focus = linesIn(groups[Math.min(step, groups.length - 1)] ?? '')
    Array.from(block.querySelectorAll('.line')).forEach((line, index) => {
      line.classList.toggle('dim', focus !== null && !focus.has(index + 1))
    })
  }
}

/**
 * A deck is Reveal.js over the Markdown the controller sent. Reveal owns the
 * DOM below `.reveal`, so React renders the container once and Reveal takes
 * over in an effect; the instance is destroyed when the page unmounts.
 */
export default function Show({ title, markdown }: Deck) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const deck = new Reveal(container.current, {
      // Code arrives highlighted from the server (Shiki), so no highlight plugin here.
      plugins: [Markdown, Notes],
      hash: true,
      slideNumber: 'c/t',
      transition: 'slide',
    })
    deck.initialize().then(() => {
      focusLines(container.current!)
      for (const event of ['slidechanged', 'fragmentshown', 'fragmenthidden'] as const) {
        deck.on(event, () => focusLines(container.current!))
      }
    })
    return () => {
      deck.destroy()
    }
  }, [markdown])

  return (
    <div className="reveal-viewport">
      <Head title={title} />
      <div ref={container} className="reveal">
        <div className="slides">
          <section
            data-markdown=""
            data-separator="^\n---\n$"
            data-separator-vertical="^\n--\n$"
            data-separator-notes="^Note:"
          >
            <script type="text/template">{markdown}</script>
          </section>
        </div>
      </div>
    </div>
  )
}
