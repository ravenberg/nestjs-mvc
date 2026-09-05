import { Link, router } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function Cache({ renderedAt }: { renderedAt: string }) {
  return (
    <AppLayout title="Cache Management" description="Tag prefetched pages, and invalidate them by tag after a mutation">
      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          The product pages are prefetched on mount with <code className="rounded bg-slate-100 px-1">cacheTags="products"</code>.
          Change a price on a product page: that form submits with{' '}
          <code className="rounded bg-slate-100 px-1">invalidateCacheTags: ['products']</code>, so every cached page with
          that tag is dropped and the next visit is fresh. Without the tag, you would see the old price for up to 30 s.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/features/prefetching/cache/products" prefetch="mount" cacheTags="products" cacheFor="30s" className={btn}>
            Products (tagged, prefetched)
          </Link>
          <Link href="/features/prefetching/cache/products/1" prefetch="mount" cacheTags={['products', 'product:1']} cacheFor="30s" className={btn}>
            Keyboard
          </Link>
          <Link href="/features/prefetching/cache/products/2" prefetch="mount" cacheTags={['products', 'product:2']} cacheFor="30s" className={btn}>
            Monitor
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button onClick={() => router.flushByCacheTags('products')} className={btn}>
            router.flushByCacheTags('products')
          </button>
          <button onClick={() => router.flush('/features/prefetching/cache/products')} className={btn}>
            router.flush(url)
          </button>
          <button onClick={() => router.flushAll()} className={btn}>
            router.flushAll()
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          After flushing, hover a link: the Network tab shows a new prefetch. This page rendered at{' '}
          {new Date(renderedAt).toLocaleTimeString()}.
        </p>
      </section>
    </AppLayout>
  )
}
