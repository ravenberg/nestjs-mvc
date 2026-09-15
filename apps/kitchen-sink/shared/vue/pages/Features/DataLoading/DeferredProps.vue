<script setup lang="ts">
import { Deferred, router, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import DemoCard from '../../../components/data-loading/DemoCard.vue'
import Skeleton from '../../../components/data-loading/Skeleton.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{
  contactCount?: number
  noteCount?: number
  slowReport?: { favorites: number; generatedAt: string }
  recommendations?: string[]
}>()

const page = usePage()
const rescued = computed(() => page.rescuedProps)
</script>

<template>
  <AppLayout title="Deferred Props" description="The page paints first; the data follows, in groups, and one prop is allowed to fail">
    <p class="mb-4 max-w-3xl text-sm text-slate-600">
      Watch the Network tab on a fresh load: the page object arrives with<code class="mx-1 rounded bg-slate-100 px-1">deferredProps</code>, then two partial requests follow, one per group. The recommendations closure throws on purpose; because it is<code class="mx-1 rounded bg-slate-100 px-1">defer(fn, { rescue: true })</code>, the counters in the same request still arrive and the response lists it under<code class="mx-1 rounded bg-slate-100 px-1">rescuedProps</code>. The server logs the error.
    </p>
    <button
      class="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      @click="router.visit('/features/data-loading/deferred-props')"
    >
      Load again
    </button>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <DemoCard title="Counters" code="defer(fn)  ×2, default group">
        <Deferred :data="['contactCount', 'noteCount']">
          <template #fallback><Skeleton :lines="2" /></template>
          <p>{{ contactCount }} contacts · {{ noteCount }} notes</p>
        </Deferred>
      </DemoCard>

      <DemoCard title="Slow report" code="defer(fn, { group: 'report' })">
        <Deferred data="slowReport">
          <template #fallback><Skeleton :lines="2" /></template>
          <p>{{ slowReport?.favorites }} favourites · generated {{ slowReport && new Date(slowReport.generatedAt).toLocaleTimeString() }}</p>
        </Deferred>
      </DemoCard>

      <DemoCard title="Recommendations (fails)" code="defer(fn, { rescue: true })">
        <Deferred data="recommendations">
          <template #fallback><Skeleton :lines="3" /></template>
          <template #rescue>
            <p class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">Recommendations are unavailable right now. Everything else on this page still loaded.</p>
          </template>
          <ul>
            <li v-for="r in recommendations" :key="r">{{ r }}</li>
          </ul>
        </Deferred>
      </DemoCard>

      <DemoCard title="What the client knows" code="usePage().rescuedProps">
        <code class="block text-xs">{{ JSON.stringify(rescued ?? []) }}</code>
        <p class="mt-2 text-xs text-slate-500">The list survives partial reloads for other props, and is cleared for a prop the moment a reload asks for it again.</p>
      </DemoCard>
    </div>
  </AppLayout>
</template>
