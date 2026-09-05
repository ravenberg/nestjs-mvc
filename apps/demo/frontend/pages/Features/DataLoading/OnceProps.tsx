import { Link, useForm, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Props {
  serverTime: string
  organizations: {
    resolvedAt: string
    items: { id: number; name: string }[]
  }
}

const time = (iso: string) => new Date(iso).toLocaleTimeString()

export default function OncePropsPage({ serverTime, organizations }: Props) {
  const page = usePage()
  const meta = page.onceProps?.organizations
  const message = page.flash?.message as string | undefined
  const form = useForm({ name: '' })

  return (
    <AppLayout title="Once Props" description="Reference data resolved once, remembered by the client across visits">
      {message && (
        <div className="mb-4 max-w-3xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
          <span className="ml-2 text-green-600">
            — a <code className="rounded bg-green-100 px-1">flash</code> from the POST, shown once.
          </span>
        </div>
      )}

      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-500">Plain prop</h2>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{time(serverTime)}</p>
          <p className="mt-1 text-sm text-slate-500">
            <code className="rounded bg-slate-100 px-1">serverTime</code> is sent on every visit.
          </p>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-sm font-semibold text-blue-700">Once prop</h2>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-900">{time(organizations.resolvedAt)}</p>
          <p className="mt-1 text-sm text-blue-800">
            <code className="rounded bg-blue-100 px-1">organizations</code> was resolved at this time and has not
            been re-fetched since.
            {meta?.expiresAt && <> The client drops it at {time(new Date(meta.expiresAt).toISOString())}.</>}
          </p>
        </section>
      </div>

      <section className="mt-4 grid max-w-3xl gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700">
            Organization
            <select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {organizations.items.map((organization) => (
                <option key={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            {organizations.items.length} options — the kind of list you would otherwise fetch through an endpoint
            and cache with a query library.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.post('/features/data-loading/once-props/organizations', { onSuccess: () => form.reset() })
          }}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <label className="block text-sm font-medium text-slate-700">
            Add an organization
            <input
              value={form.data.name}
              onChange={(e) => form.setData('name', e.target.value)}
              placeholder="Initech"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          {form.errors.name && <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>}
          <button
            type="submit"
            disabled={form.processing}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
          <p className="mt-2 text-xs text-slate-500">
            The POST calls <code className="rounded bg-slate-100 px-1">view.refresh('organizations')</code> and
            redirects back: the dropdown is re-resolved once, and the stamp above changes.
          </p>
        </form>
      </section>

      <section className="mt-4 max-w-3xl text-sm text-slate-600">
        <p>
          Watch the Network tab. Every visit after the first sends
          <code className="mx-1 rounded bg-slate-100 px-1">X-Inertia-Except-Once-Props: organizations</code>
          and the response leaves <code className="rounded bg-slate-100 px-1">organizations</code> out entirely:
          the closure never ran. The server keeps no cache — the client remembers, the server only reads the
          header. The refresh signal after a mutation travels the same way: in a cookie the client carries, not
          in server memory.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/features/data-loading/once-props"
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Visit again
          </Link>
          <Link
            href="/features/data-loading/once-props?fresh=1"
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          >
            Visit with <code className="rounded bg-slate-100 px-1">fresh</code>
          </Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Leave and come back
          </Link>
        </div>
        <p className="mt-3">
          The key is set with <code className="rounded bg-slate-100 px-1">as: 'organizations'</code>, so any
          other page returning a once prop under that key reuses the same client copy.
          <code className="mx-1 rounded bg-slate-100 px-1">until: 300</code> expires it after five minutes.
        </p>
      </section>
    </AppLayout>
  )
}
