import { Link, router, usePage, usePrefetch } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Product {
  id: number
  name: string
  price: number
  updatedAt: string
}

export default function ProductPage({ product, renderedAt }: { product: Product | null; renderedAt: string }) {
  const flash = usePage().flash?.message as string | undefined
  const { isPrefetched } = usePrefetch()

  if (!product) {
    return (
      <AppLayout title="Product" description="Not found">
        <p className="text-sm text-slate-500">No such product.</p>
      </AppLayout>
    )
  }

  const reprice = (delta: number) =>
    router.post(
      `/features/prefetching/cache/products/${product.id}/price`,
      { delta },
      // The mutation makes every cached "products" page stale: drop them by tag.
      { invalidateCacheTags: ['products'], preserveScroll: true },
    )

  return (
    <AppLayout title={product.name} description="A tagged product page; repricing invalidates the tag">
      {flash && <div className="mb-4 max-w-xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-3xl font-semibold tabular-nums">€{product.price}</p>
        <p className="mt-1 text-xs text-slate-500">
          price updated {new Date(product.updatedAt).toLocaleTimeString()} · page rendered {new Date(renderedAt).toLocaleTimeString()} ·
          from prefetch cache: {String(isPrefetched)}
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => reprice(10)} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">
            +€10 (invalidates 'products')
          </button>
          <button onClick={() => reprice(-10)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            −€10
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/features/prefetching/cache/products" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Products list
          </Link>
          <Link href="/features/prefetching/cache" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Cache Management
          </Link>
        </div>
      </section>
    </AppLayout>
  )
}
