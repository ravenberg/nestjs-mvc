import { Deferred, InfiniteScroll, Link } from '@inertiajs/react'
import { Star } from 'lucide-react'
import { AppLayout } from '../../layouts/AppLayout'

interface ContactRow {
  id: number
  name: string
  email: string | null
  isFavorite: boolean
}

interface Props {
  organization: { id: number; name: string; city: string | null }
  /** Deferred *and* scrollable: absent on the first render, then paged by cursor. */
  contacts?: { data: ContactRow[]; nextPage: number | null }
}

export default function Show({ organization, contacts }: Props) {
  return (
    <AppLayout title={organization.name} description={organization.city ?? undefined}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Contacts</h2>
        <p className="text-sm text-slate-500">
          Deferred, so the header renders without waiting on this query; then loaded four at a time
          with a keyset cursor (<code className="rounded bg-slate-100 px-1">?cursor=&lt;id&gt;</code>).
        </p>

        <Deferred
          data="contacts"
          fallback={
            <div className="mt-4 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          }
        >
          <InfiniteScroll
            data="contacts"
            manual
            next={({ fetch, hasMore, loading }) =>
              hasMore && (
                <button
                  type="button"
                  onClick={fetch}
                  disabled={loading}
                  className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )
            }
          >
            <ul className="mt-4 divide-y divide-slate-100">
              {contacts?.data.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between py-2.5">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    {contact.isFavorite && <Star className="size-4 fill-amber-400 text-amber-500" />}
                    {contact.name}
                  </Link>
                  <span className="text-sm text-slate-500">{contact.email}</span>
                </li>
              ))}
              {contacts?.data.length === 0 && (
                <li className="py-3 text-sm text-slate-500">No contacts in this organization.</li>
              )}
            </ul>
          </InfiniteScroll>
        </Deferred>
      </section>
    </AppLayout>
  )
}
