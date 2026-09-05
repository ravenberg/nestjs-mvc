import { Deferred, Link } from '@inertiajs/react'
import { Star } from 'lucide-react'
import { AppLayout } from '../../layouts/AppLayout'

interface Props {
  organization: { id: number; name: string; city: string | null }
  contacts?: { id: number; name: string; email: string | null; isFavorite: boolean }[]
}

export default function Show({ organization, contacts }: Props) {
  return (
    <AppLayout title={organization.name} description={organization.city ?? undefined}>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Contacts</h2>
        <p className="text-sm text-slate-500">
          Deferred, so the organization header renders without waiting on this query.
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
          <ul className="mt-4 divide-y divide-slate-100">
            {contacts?.map((contact) => (
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
            {contacts?.length === 0 && (
              <li className="py-3 text-sm text-slate-500">No contacts in this organization.</li>
            )}
          </ul>
        </Deferred>
      </section>
    </AppLayout>
  )
}
