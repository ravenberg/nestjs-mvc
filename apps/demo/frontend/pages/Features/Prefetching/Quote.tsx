import { Link, usePrefetch } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function Quote({ quote, renderedAt }: { quote: string; renderedAt: string }) {
  const { isPrefetched, lastUpdatedAt, flush } = usePrefetch()
  const [updates, setUpdates] = useState<string[]>([])

  // Every change of the props is an update: the initial show, then the background refresh.
  useEffect(() => {
    setUpdates((list) => [...list, `${new Date().toLocaleTimeString()} → rendered ${new Date(renderedAt).toLocaleTimeString()}`])
  }, [renderedAt])

  return (
    <AppLayout title="Quote" description="Changes on the server every second; watch it swap after a stale visit">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <blockquote className="text-lg font-medium">“{quote}”</blockquote>
        <p className="mt-2 text-xs text-slate-500">rendered on the server at {new Date(renderedAt).toLocaleTimeString()}</p>

        <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Updates seen by this component</h2>
        <ul className="mt-1 text-xs tabular-nums text-slate-600">
          {updates.map((u, i) => (
            <li key={i}>{u}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          usePrefetch(): isPrefetched {String(isPrefetched)} · lastUpdatedAt{' '}
          {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—'}
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/features/prefetching/swr" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Back
          </Link>
          <button onClick={flush} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            flush() this page's cache entry
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
