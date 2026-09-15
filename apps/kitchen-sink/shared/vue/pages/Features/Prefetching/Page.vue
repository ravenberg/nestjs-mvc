<script setup lang="ts">
import { Link, usePrefetch } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

const props = defineProps<{ n: number; renderedAt: string }>()

// Fixed when the component is created: how old the server's render was when it reached the screen.
const shownAt = new Date()
const rendered = computed(() => new Date(props.renderedAt))
const age = computed(() => Math.round((shownAt.getTime() - rendered.value.getTime()) / 100) / 10)
const { isPrefetched, lastUpdatedAt } = usePrefetch()
</script>

<template>
  <AppLayout :title="`Page ${n}`" description="A slow page, possibly served from the prefetch cache">
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt class="text-slate-500">Rendered on the server</dt>
        <dd class="tabular-nums">{{ rendered.toLocaleTimeString() }}</dd>
        <dt class="text-slate-500">Shown in the browser</dt>
        <dd class="tabular-nums">{{ shownAt.toLocaleTimeString() }}</dd>
        <dt class="text-slate-500">Age when shown</dt>
        <dd :class="age > 0.6 ? 'font-semibold text-green-700' : ''">{{ age }} s {{ age > 0.6 ? '— came from the prefetch cache' : '— rendered for this click' }}</dd>
        <dt class="text-slate-500">usePrefetch()</dt>
        <dd class="text-xs">isPrefetched {{ String(isPrefetched) }} · lastUpdatedAt {{ lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : '—' }}</dd>
      </dl>
      <Link href="/features/prefetching/links" class="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
        Back to Link Prefetch
      </Link>
    </section>
  </AppLayout>
</template>
