import { Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../layouts/AppLayout'

interface Props {
  organizations: { id: number; name: string; city: string | null; contactCount: number }[]
  filters: { search: string }
}

export default function Index({ organizations, filters }: Props) {
  const [search, setSearch] = useState(filters.search)

  return (
    <AppLayout title="Organizations" description={`${organizations.length} organizations`}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          router.get('/organizations', search ? { search } : {}, { preserveState: true, replace: true })
        }}
        className="mb-4"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations…"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/organizations/${organization.id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
          >
            <p className="font-medium">{organization.name}</p>
            <p className="mt-1 text-sm text-slate-500">{organization.city ?? '—'}</p>
            <p className="mt-3 text-xs text-slate-400">
              {organization.contactCount} {organization.contactCount === 1 ? 'contact' : 'contacts'}
            </p>
          </Link>
        ))}
      </div>
    </AppLayout>
  )
}
