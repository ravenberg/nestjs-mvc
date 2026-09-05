import { Link } from '@inertiajs/react'
import { AppLayout } from '../../layouts/AppLayout'

const TITLES: Record<number, string> = {
  403: 'Forbidden',
  404: 'Not found',
  419: 'Page expired',
  429: 'Too many requests',
  500: 'Server error',
  503: 'Service unavailable',
}

/**
 * The single error page: `errorPages` in `app.module.ts` renders it for the
 * statuses it covers, with the status as a prop and the response status set to
 * match. Because `shared: true` is set there, the sidebar's `auth.user` is
 * present just like on any other page.
 */
export default function Show({ status, reason }: { status: number; reason?: string }) {
  return (
    <AppLayout title={`${status} · ${TITLES[status] ?? 'Error'}`} description="Rendered by errorPages, with the status code of the error">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-6xl font-bold tabular-nums text-slate-300">{status}</p>
        <h2 className="mt-2 text-lg font-semibold">{TITLES[status] ?? 'Something went wrong'}</h2>
        {reason && <p className="mt-1 text-sm text-slate-500">{reason}</p>}
        <Link
          href="/features/errors/http"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to HTTP Exceptions
        </Link>
      </section>
    </AppLayout>
  )
}
