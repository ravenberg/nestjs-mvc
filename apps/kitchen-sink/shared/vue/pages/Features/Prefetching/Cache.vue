<script setup lang="ts">
import { Link, router } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string }>()

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'
</script>

<template>
  <AppLayout title="Cache Management" description="Tag prefetched pages, and invalidate them by tag after a mutation">
    <section class="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        The product pages are prefetched on mount with <code class="rounded bg-slate-100 px-1">cacheTags="products"</code>. Change a price on a product page: that form submits with <code class="rounded bg-slate-100 px-1">invalidateCacheTags: ['products']</code>, so every cached page with that tag is dropped and the next visit is fresh. Without the tag, you would see the old price for up to 30 s.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <Link href="/features/prefetching/cache/products" prefetch="mount" cache-tags="products" cache-for="30s" :class="btn">
          Products (tagged, prefetched)
        </Link>
        <Link href="/features/prefetching/cache/products/1" prefetch="mount" :cache-tags="['products', 'product:1']" cache-for="30s" :class="btn">
          Keyboard
        </Link>
        <Link href="/features/prefetching/cache/products/2" prefetch="mount" :cache-tags="['products', 'product:2']" cache-for="30s" :class="btn">
          Monitor
        </Link>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button :class="btn" @click="router.flushByCacheTags('products')">router.flushByCacheTags('products')</button>
        <button :class="btn" @click="router.flush('/features/prefetching/cache/products')">router.flush(url)</button>
        <button :class="btn" @click="router.flushAll()">router.flushAll()</button>
      </div>
      <p class="mt-3 text-xs text-slate-400">
        After flushing, hover a link: the Network tab shows a new prefetch. This page rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
      </p>
    </section>
  </AppLayout>
</template>
