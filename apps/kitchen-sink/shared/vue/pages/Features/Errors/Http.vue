<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ statuses: { status: number; reason: string }[] }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
</script>

<template>
  <AppLayout title="HTTP Exceptions" description="Your own error pages for the statuses you choose">
    <div v-if="flash" role="status" class="mb-4 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{{ flash }}</div>
    <section class="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <p class="text-sm text-slate-600">
        Each link hits a handler that throws. The <code class="rounded bg-slate-100 px-1">errorPages</code> callback on <code class="rounded bg-slate-100 px-1">MvcModule.forRoot()</code> renders <code class="rounded bg-slate-100 px-1">Errors/Show</code> for 403, 404, 500 and 503 — as an Inertia visit (watch the Network tab: the response has the error status <em>and</em> a page object) or as a first load (open one in a new tab). For 429 it returns <code class="rounded bg-slate-100 px-1">{ redirect: 'back', flash }</code> instead: you land back here with a message. 419 is the exception the CSRF guard throws for a stale token; nestjs-mvc sends an Inertia visit back with “This page has expired” by itself, no configuration.
      </p>
      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
        <li v-for="{ status, reason } in statuses" :key="status">
          <Link :href="`/features/errors/http/${status}`" class="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50">
            <span class="w-10 font-mono font-semibold tabular-nums">{{ status }}</span>
            <span class="text-slate-600">{{ reason }}</span>
          </Link>
        </li>
      </ul>
    </section>
  </AppLayout>
</template>
