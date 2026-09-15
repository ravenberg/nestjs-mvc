<script setup lang="ts">
import { Link, router, usePage, usePrefetch } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Product {
  id: number
  name: string
  price: number
  updatedAt: string
}

const props = defineProps<{ product: Product | null; renderedAt: string }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
const { isPrefetched } = usePrefetch()

function reprice(delta: number) {
  if (!props.product) return
  router.post(
    `/features/prefetching/cache/products/${props.product.id}/price`,
    { delta },
    // The mutation makes every cached "products" page stale: drop them by tag.
    { invalidateCacheTags: ['products'], preserveScroll: true },
  )
}
</script>

<template>
  <AppLayout v-if="!product" title="Product" description="Not found">
    <p class="text-sm text-slate-500">No such product.</p>
  </AppLayout>

  <AppLayout v-else :title="product.name" description="A tagged product page; repricing invalidates the tag">
    <div v-if="flash" class="mb-4 max-w-xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-3xl font-semibold tabular-nums">€{{ product.price }}</p>
      <p class="mt-1 text-xs text-slate-500">
        price updated {{ new Date(product.updatedAt).toLocaleTimeString() }} · page rendered {{ new Date(renderedAt).toLocaleTimeString() }} · from prefetch cache: {{ String(isPrefetched) }}
      </p>
      <div class="mt-4 flex gap-2">
        <button class="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700" @click="reprice(10)">+€10 (invalidates 'products')</button>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50" @click="reprice(-10)">−€10</button>
      </div>
      <div class="mt-4 flex gap-2">
        <Link href="/features/prefetching/cache/products" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Products list</Link>
        <Link href="/features/prefetching/cache" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Cache Management</Link>
      </div>
    </section>
  </AppLayout>
</template>
