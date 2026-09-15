<script setup lang="ts">
import VisibleBlock from '../../../components/data-loading/VisibleBlock.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Section {
  name: string
  loadedAt: string
}

defineProps<{ recent?: Section; reports?: Section; archive?: Section }>()
</script>

<template>
  <AppLayout title="When Visible" description="Props that load when their section scrolls into view">
    <section class="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        The three sections below are <code class="rounded bg-slate-100 px-1">optional()</code> props: left out of the first load. Each is wrapped in <code class="rounded bg-slate-100 px-1">&lt;WhenVisible data="…"&gt;</code>, which fires a partial reload for that one prop when it enters the viewport. Scroll, and watch the Network tab: one request per section, with <code class="rounded bg-slate-100 px-1">X-Inertia-Partial-Data</code>.
      </p>
    </section>
    <div class="space-y-4">
      <VisibleBlock name="recent" :section="recent" />
      <VisibleBlock name="reports" :section="reports" />
      <VisibleBlock name="archive" :section="archive" always />
    </div>
  </AppLayout>
</template>
