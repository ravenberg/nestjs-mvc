import { Link, usePrefetch } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function PrefetchPage({ n, renderedAt }: { n: number; renderedAt: string }) {
  const [shownAt] = useState(() => new Date())
  const rendered = new Date(renderedAt)
  const age = Math.round((shownAt.getTime() - rendered.getTime()) / 100) / 10
  const { isPrefetched, lastUpdatedAt } = usePrefetch()

  return (
    <AppLayout title={`Page ${n}`} description="A slow page, possibly served from the prefetch cache">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-slate-500">Rendered on the server</dt>
          <dd className="tabular-nums">{rendered.toLocaleTimeString()}</dd>
          <dt className="text-slate-500">Shown in the browser</dt>
          <dd className="tabular-nums">{shownAt.toLocaleTimeString()}</dd>
          <dt className="text-slate-500">Age when shown</dt>
          <dd className={age > 0.6 ? 'font-semibold text-green-700' : ''}>
            {age} s {age > 0.6 ? '— came from the prefetch cache' : '— rendered for this click'}
          </dd>
          <dt className="text-slate-500">usePrefetch()</dt>
          <dd className="text-xs">
            isPrefetched {String(isPrefetched)} · lastUpdatedAt {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—'}
          </dd>
        </dl>
        <Link href="/features/prefetching/links" className="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Back to Link Prefetch
        </Link>
      </section>
    </AppLayout>
  )
}
