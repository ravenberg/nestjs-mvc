import { Link } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

const card = 'rounded-xl border border-slate-200 bg-white p-5 text-sm'
const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function PrefetchLinks({ renderedAt }: { renderedAt: string }) {
  return (
    <AppLayout title="Link Prefetch" description="Fetch the next page before the click, so the visit is instant">
      <section className={`${card} mb-4 max-w-3xl`}>
        <p className="text-slate-600">
          Every target page sleeps 400 ms on the server and stamps when it rendered. A prefetched visit shows a stamp
          from <em>before</em> the click and no wait. Watch the Network tab: prefetch requests carry{' '}
          <code className="rounded bg-slate-100 px-1">Purpose: prefetch</code>, and the adapter's{' '}
          <code className="rounded bg-slate-100 px-1">isPrefetch()</code> lets a handler know (fragment redirects skip
          their 409 for one, for instance). Cached for 30 s by default. This page rendered at{' '}
          {new Date(renderedAt).toLocaleTimeString()}.
        </p>
      </section>

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <section className={card}>
          <h2 className="font-semibold">on hover (default)</h2>
          <p className="mt-1 text-xs text-slate-500">Starts after 75 ms of hovering; the click is then instant.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/features/prefetching/links/page/1" prefetch className={btn}>page 1</Link>
            <Link href="/features/prefetching/links/page/2" prefetch className={btn}>page 2</Link>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">on mount</h2>
          <p className="mt-1 text-xs text-slate-500">Fetched as soon as the link renders — already in the Network tab.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/features/prefetching/links/page/3" prefetch="mount" className={btn}>page 3</Link>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">on click (mousedown)</h2>
          <p className="mt-1 text-xs text-slate-500">Starts on mousedown, a few dozen ms before the click completes.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/features/prefetching/links/page/4" prefetch="click" className={btn}>page 4</Link>
          </div>
        </section>
        <section className={card}>
          <h2 className="font-semibold">no prefetch</h2>
          <p className="mt-1 text-xs text-slate-500">For contrast: the full 400 ms on click, and the progress bar.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/features/prefetching/links/page/5" className={btn}>page 5</Link>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
