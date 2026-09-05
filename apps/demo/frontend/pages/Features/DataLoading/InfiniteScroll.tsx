import { InfiniteScroll, Link } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface NoteRow {
  id: number
  body: string
  createdAt: string
  user: string
  contact: { id: number; name: string }
}

interface Props {
  notes: {
    data: NoteRow[]
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    previousPage: number | null
    nextPage: number | null
  }
}

/** The strip at either end of the list: what is happening there, or that the end was reached. */
function Edge({ loading, hasMore, more, done }: { loading: boolean; hasMore: boolean; more: string; done: string }) {
  return (
    <p className={`py-3 text-center text-xs ${loading ? 'text-blue-600' : 'text-slate-400'}`}>
      {hasMore ? (loading ? 'Loading…' : more) : done}
    </p>
  )
}

export default function InfiniteScrollPage({ notes }: Props) {
  return (
    <AppLayout
      title="Infinite Scroll"
      description={`${notes.total} notes, ${notes.perPage} per page, landed on page ${notes.currentPage} of ${notes.lastPage}`}
    >
      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        This page lands mid-way, so both ends load as you scroll. Reaching the bottom sends a partial reload
        for the next page and the server labels it under <code className="rounded bg-slate-100 px-1">mergeProps</code>;
        reaching the top sends <code className="mx-1 rounded bg-slate-100 px-1">X-Inertia-Infinite-Scroll-Merge-Intent: prepend</code>
        and it comes back under <code className="rounded bg-slate-100 px-1">prependProps</code>, with your scroll
        position kept. Watch the Network tab: no navigation, only partial requests with a page number.
      </p>

      <InfiniteScroll
        data="notes"
        buffer={150}
        previous={({ loading, hasMore }) => (
          <Edge loading={loading} hasMore={hasMore} more="Scroll up for newer notes" done="Newest notes reached" />
        )}
        next={({ loading, hasMore }) => (
          <Edge loading={loading} hasMore={hasMore} more="Scroll down for older notes" done="Oldest notes reached" />
        )}
      >
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {notes.data.map((note) => (
            <li key={note.id} className="px-5 py-3">
              <p className="text-sm text-slate-800">{note.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                #{note.id} · {note.user} on{' '}
                <Link href={`/contacts/${note.contact.id}`} className="hover:underline">
                  {note.contact.name}
                </Link>{' '}
                · {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      </InfiniteScroll>
    </AppLayout>
  )
}
