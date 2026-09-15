<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'
import { computed, ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

const props = defineProps<{
  contacts: { count: number; resolvedAt: string }
  stats?: { organizations: number; notes: number; resolvedAt: string }
  audit?: { entries: number; resolvedAt: string }
}>()

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString() : '—')
const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50'

const busy = ref(false)
const reload = (options: Parameters<typeof router.reload>[0]) =>
  router.reload({ ...options, onStart: () => (busy.value = true), onFinish: () => (busy.value = false) })

const cards = computed(() => [
  { name: 'contacts', value: `${props.contacts.count} contacts`, at: props.contacts.resolvedAt, note: 'cheap' },
  {
    name: 'stats',
    value: props.stats ? `${props.stats.organizations} orgs · ${props.stats.notes} notes` : '—',
    at: props.stats?.resolvedAt,
    note: '700 ms',
  },
  { name: 'audit', value: props.audit ? `${props.audit.entries} entries` : 'not loaded', at: props.audit?.resolvedAt, note: 'optional()' },
])
</script>

<template>
  <AppLayout title="Partial Reloads" description="Ask for some props, and the server resolves only those">
    <section class="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        Every prop is stamped with the time it was resolved. A reload with <code class="rounded bg-slate-100 px-1">only</code> or <code class="rounded bg-slate-100 px-1">except</code> sends <code class="rounded bg-slate-100 px-1">X-Inertia-Partial-Data</code>; the resolver matches paths before evaluating anything, so the closures of the other props never run — the 700 ms in <code class="rounded bg-slate-100 px-1">stats</code> is only paid when stats is asked for. <code class="rounded bg-slate-100 px-1">audit</code> is <code class="rounded bg-slate-100 px-1">optional()</code>: absent until a reload names it.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button :disabled="busy" :class="btn" @click="reload({})">reload() — everything</button>
        <button :disabled="busy" :class="btn" @click="reload({ only: ['contacts'] })">only: ['contacts']</button>
        <button :disabled="busy" :class="btn" @click="reload({ only: ['stats'] })">only: ['stats']</button>
        <button :disabled="busy" :class="btn" @click="reload({ except: ['stats'] })">except: ['stats']</button>
        <button :disabled="busy" :class="btn" @click="reload({ only: ['audit'] })">only: ['audit'] (optional)</button>
      </div>
    </section>

    <div class="grid max-w-3xl gap-4 sm:grid-cols-3">
      <section v-for="card in cards" :key="card.name" class="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 class="font-semibold">{{ card.name }}</h2>
        <p class="text-xs text-slate-500">{{ card.note }}</p>
        <p class="mt-2">{{ card.value }}</p>
        <p class="mt-1 text-xs tabular-nums text-slate-500">resolved {{ time(card.at) }}</p>
      </section>
    </div>
  </AppLayout>
</template>
