<script setup lang="ts">
import { Link, usePrefetch } from 'nestjs-mvc/vue'
import { ref, watch } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

const props = defineProps<{ quote: string; renderedAt: string }>()

const { isPrefetched, lastUpdatedAt, flush } = usePrefetch()
const updates = ref<string[]>([])

// Every change of the props is an update: the initial show, then the background refresh.
watch(
  () => props.renderedAt,
  (renderedAt) => {
    updates.value = [...updates.value, `${new Date().toLocaleTimeString()} → rendered ${new Date(renderedAt).toLocaleTimeString()}`]
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout title="Quote" description="Changes on the server every second; watch it swap after a stale visit">
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <blockquote class="text-lg font-medium">“{{ quote }}”</blockquote>
      <p class="mt-2 text-xs text-slate-500">rendered on the server at {{ new Date(renderedAt).toLocaleTimeString() }}</p>

      <h2 class="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Updates seen by this component</h2>
      <ul class="mt-1 text-xs tabular-nums text-slate-600">
        <li v-for="(u, i) in updates" :key="i">{{ u }}</li>
      </ul>
      <p class="mt-3 text-xs text-slate-500">
        usePrefetch(): isPrefetched {{ String(isPrefetched) }} · lastUpdatedAt {{ lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—' }}
      </p>
      <div class="mt-4 flex gap-2">
        <Link href="/features/prefetching/swr" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Back</Link>
        <button class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50" @click="flush()">flush() this page's cache entry</button>
      </div>
    </section>
  </AppLayout>
</template>
