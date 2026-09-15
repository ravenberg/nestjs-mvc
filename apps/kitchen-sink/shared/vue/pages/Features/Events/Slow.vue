<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string; waited: number }>()
</script>

<template>
  <AppLayout title="Slow page" description="A visit target that takes its time">
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p>The server waited {{ waited }} ms and rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.</p>
      <div class="mt-4 flex gap-2">
        <Link href="/features/events/global" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Global Events</Link>
        <Link href="/features/events/callbacks" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Visit Callbacks</Link>
        <Link href="/features/events/progress" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Progress</Link>
      </div>
    </section>
  </AppLayout>
</template>
