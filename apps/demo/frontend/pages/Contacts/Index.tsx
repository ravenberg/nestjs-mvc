import { Link, router } from '@inertiajs/react'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { AppLayout } from '../../layouts/AppLayout'

interface ContactRow {
  id: number
  name: string
  email: string | null
  phone: string | null
  isFavorite: boolean
  organization: { id: number; name: string } | null
}

interface Props {
  contacts: ContactRow[]
  total: number
  filters: { search: string; favorite: boolean }
}

export default function Index({ contacts, total, filters }: Props) {
  const [search, setSearch] = useState(filters.search)

  const apply = (next: Partial<{ search: string; favorite: boolean }>) => {
    const params: Record<string, string> = {}
    const merged = { search, favorite: filters.favorite, ...next }
    if (merged.search) params.search = merged.search
    if (merged.favorite) params.favorite = '1'
    router.get('/contacts', params, { preserveState: true, replace: true })
  }

  return (
    <AppLayout title="Contacts" description={`${total} contacts`}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply({})
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => apply({ favorite: !filters.favorite })}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            filters.favorite
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Star className={`size-4 ${filters.favorite ? 'fill-amber-400 text-amber-500' : ''}`} />
          Favorites
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2 font-medium">
                    {contact.isFavorite && <Star className="size-4 fill-amber-400 text-amber-500" />}
                    {contact.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {contact.organization ? (
                    <Link href={`/organizations/${contact.organization.id}`} className="hover:underline">
                      {contact.organization.name}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{contact.email}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                  No contacts match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing the first {contacts.length} of {total}. Infinite scroll arrives with the
        <code className="mx-1 rounded bg-slate-100 px-1">scroll()</code>prop.
      </p>
    </AppLayout>
  )
}
