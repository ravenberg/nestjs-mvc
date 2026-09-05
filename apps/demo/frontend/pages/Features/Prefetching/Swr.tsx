import { Link } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function Swr({ renderedAt }: { renderedAt: string }) {
  return (
    <AppLayout title="Stale While Revalidate" description="Serve the cached page at once, refresh it in the background">
      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          <code className="rounded bg-slate-100 px-1">cacheFor</code> with two values: fresh for the first, then{' '}
          <em>stale</em> until the second. A visit to a stale page shows the cached copy immediately and fetches a new one
          behind it; when that lands the props update in place. The quote page changes every second on the server, so
          you can see the swap.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/features/prefetching/swr/quote" prefetch cacheFor={['3s', '1m']} className={btn}>
            quote · fresh 3 s, stale until 1 min
          </Link>
          <Link href="/features/prefetching/swr/quote" prefetch cacheFor="10s" className={btn}>
            quote · cached 10 s, no SWR
          </Link>
          <Link href="/features/prefetching/swr/quote" className={btn}>
            quote · no cache
          </Link>
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-slate-500">
          <li>Hover the first link (prefetch), wait 4 s, click: the stale copy appears instantly…</li>
          <li>…and a second later the quote and stamp change, without a visit.</li>
          <li>The three links share one URL, so the cache entry is the same; only the policy differs.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-400">This page rendered at {new Date(renderedAt).toLocaleTimeString()}.</p>
      </section>
    </AppLayout>
  )
}
