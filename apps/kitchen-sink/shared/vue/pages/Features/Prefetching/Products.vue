<script setup lang="ts">
import { Link, usePrefetch } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Product {
  id: number
  name: string
  price: number
  updatedAt: string
}

defineProps<{ products: Product[]; renderedAt: string }>()

const { isPrefetched } = usePrefetch()
</script>

<template>
  <AppLayout title="Products" description="A tagged, prefetched list">
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-xs text-slate-500">rendered {{ new Date(renderedAt).toLocaleTimeString() }} · served from prefetch cache: {{ String(isPrefetched) }}</p>
      <ul class="mt-3 divide-y divide-slate-100">
        <li v-for="p in products" :key="p.id" class="flex items-center justify-between py-2">
          <Link :href="`/features/prefetching/cache/products/${p.id}`" prefetch :cache-tags="['products', `product:${p.id}`]" class="font-medium hover:underline">
            {{ p.name }}
          </Link>
          <span class="tabular-nums">€{{ p.price }}</span>
        </li>
      </ul>
      <Link href="/features/prefetching/cache" class="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
        Back to Cache Management
      </Link>
    </section>
  </AppLayout>
</template>
