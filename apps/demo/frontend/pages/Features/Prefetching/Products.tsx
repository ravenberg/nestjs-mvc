import { Link, usePrefetch } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Product {
  id: number
  name: string
  price: number
  updatedAt: string
}

export default function Products({ products, renderedAt }: { products: Product[]; renderedAt: string }) {
  const { isPrefetched } = usePrefetch()
  return (
    <AppLayout title="Products" description="A tagged, prefetched list">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-xs text-slate-500">
          rendered {new Date(renderedAt).toLocaleTimeString()} · served from prefetch cache: {String(isPrefetched)}
        </p>
        <ul className="mt-3 divide-y divide-slate-100">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <Link href={`/features/prefetching/cache/products/${p.id}`} prefetch cacheTags={['products', `product:${p.id}`]} className="font-medium hover:underline">
                {p.name}
              </Link>
              <span className="tabular-nums">€{p.price}</span>
            </li>
          ))}
        </ul>
        <Link href="/features/prefetching/cache" className="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Back to Cache Management
        </Link>
      </section>
    </AppLayout>
  )
}
