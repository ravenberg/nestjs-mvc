import { Link } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function Http({ statuses }: { statuses: { status: number; reason: string }[] }) {
  return (
    <AppLayout title="HTTP Exceptions" description="Your own error pages for the statuses you choose">
      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Each link hits a handler that throws. The <code className="rounded bg-slate-100 px-1">errorPages</code>{' '}
          callback on <code className="rounded bg-slate-100 px-1">MvcModule.forRoot()</code> renders{' '}
          <code className="rounded bg-slate-100 px-1">Errors/Show</code> for 403, 404, 500 and 503 — as an Inertia visit
          (watch the Network tab: the response has the error status <em>and</em> a page object) or as a first load
          (open one in a new tab). 419 and 429 are left to NestJS on purpose, so you see the default JSON
          in the error dialog.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {statuses.map(({ status, reason }) => (
            <li key={status}>
              <Link
                href={`/features/errors/http/${status}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50"
              >
                <span className="w-10 font-mono font-semibold tabular-nums">{status}</span>
                <span className="text-slate-600">{reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppLayout>
  )
}
