import { Head, Link } from 'nestjs-mvc/react'

interface DeckSummary {
  slug: string
  title: string
  description: string | null
  slides: number
}

export default function Index({ decks }: { decks: DeckSummary[] }) {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 font-sans text-slate-100">
      <Head title="Slides" />
      <main className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Slides</h1>
        <p className="mt-2 text-slate-400">
          One Markdown file per deck in <code className="rounded bg-slate-800 px-1">content/decks/</code>. Press <kbd>S</kbd> in a deck
          for speaker notes, <kbd>F</kbd> for full screen, <kbd>Esc</kbd> for the overview.
        </p>
        <ul className="mt-10 divide-y divide-slate-800 rounded-xl border border-slate-800">
          {decks.map((deck) => (
            <li key={deck.slug} className="flex items-center justify-between gap-6 p-5">
              <div>
                <Link href={`/decks/${deck.slug}`} className="text-lg font-medium text-sky-300 hover:text-sky-200">
                  {deck.title}
                </Link>
                {deck.description && <p className="mt-1 text-sm text-slate-400">{deck.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500">
                <span>{deck.slides} slides</span>
                <a href={`/decks/${deck.slug}?print-pdf`} target="_blank" rel="noreferrer" className="hover:text-slate-300">
                  PDF
                </a>
              </div>
            </li>
          ))}
          {decks.length === 0 && <li className="p-5 text-slate-500">No decks yet. Add a Markdown file to content/decks/.</li>}
        </ul>
      </main>
    </div>
  )
}
