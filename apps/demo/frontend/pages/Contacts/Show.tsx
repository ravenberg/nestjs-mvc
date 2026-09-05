import { Deferred, Link } from '@inertiajs/react'
import { Star } from 'lucide-react'
import { AppLayout } from '../../layouts/AppLayout'

interface Note {
  id: number
  body: string
  createdAt: string
  user: { id: number; name: string }
}

interface Props {
  contact: {
    id: number
    name: string
    email: string | null
    phone: string | null
    isFavorite: boolean
    organization: { id: number; name: string } | null
  }
  notes?: Note[]
}

export default function Show({ contact, notes }: Props) {
  return (
    <AppLayout title={contact.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{contact.name}</h2>
            {contact.isFavorite && <Star className="size-4 fill-amber-400 text-amber-500" />}
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{contact.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{contact.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Organization</dt>
              <dd>
                {contact.organization ? (
                  <Link
                    href={`/organizations/${contact.organization.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {contact.organization.name}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="font-semibold">Notes</h2>
          <p className="text-sm text-slate-500">
            A <code className="rounded bg-slate-100 px-1">defer()</code> prop — the profile paints
            first, notes stream in right after.
          </p>

          <Deferred
            data="notes"
            fallback={
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            }
          >
            <ul className="mt-4 divide-y divide-slate-100">
              {notes?.map((note) => (
                <li key={note.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium">{note.user.name}</p>
                    <time className="text-xs text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString('en-GB')}
                    </time>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{note.body}</p>
                </li>
              ))}
              {notes?.length === 0 && <li className="py-3 text-sm text-slate-500">No notes yet.</li>}
            </ul>
          </Deferred>
        </section>
      </div>
    </AppLayout>
  )
}
