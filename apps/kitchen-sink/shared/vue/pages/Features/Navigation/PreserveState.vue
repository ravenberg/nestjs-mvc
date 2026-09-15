<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ tab: string; renderedAt: string }>()

const TABS = ['profile', 'billing', 'team']

// Component state: kept when a visit reuses this instance, reset when it remounts.
const draft = ref('')
const mounted = new Date().toLocaleTimeString()

const groups = [
  { heading: 'preserveState', preserveState: true, text: 'Same instance: the draft and mount time survive; only the props update.' },
  { heading: 'default', preserveState: false, text: 'Remounted: the draft is gone and the mount time changes.' },
]
</script>

<template>
  <AppLayout title="Preserve State" description="Whether a visit to the same component keeps the component instance, or remounts it">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          Type something below, then switch tabs. The props change either way (server-rendered at <span class="tabular-nums">{{ new Date(renderedAt).toLocaleTimeString() }}</span>); what differs is whether Vue keeps this component instance — and with it your draft and the mount time.
        </p>
        <label class="mt-4 block">
          <span class="font-medium text-slate-700">Local draft (component state, never sent)</span>
          <input
            v-model="draft"
            placeholder="Type, then switch tabs…"
            class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
        <p class="mt-2 text-xs text-slate-500">Component mounted at {{ mounted }}</p>
      </section>

      <section class="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <div v-for="group in groups" :key="group.heading">
          <h2 class="font-semibold">{{ group.heading }}</h2>
          <p class="mt-1 text-slate-600">{{ group.text }}</p>
          <div class="mt-2 flex gap-2">
            <Link
              v-for="t in TABS"
              :key="t"
              :href="`/features/navigation/preserve-state?tab=${t}`"
              :preserve-state="group.preserveState"
              :class="['rounded-lg border px-3 py-1.5 text-sm', tab === t ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-300 hover:bg-slate-50']"
            >
              {{ t }}
            </Link>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          Current tab: <strong>{{ tab }}</strong>. Forms with <code class="rounded bg-slate-100 px-1">useForm</code> and filters use <code class="rounded bg-slate-100 px-1">preserveState</code> for exactly this reason; the Contacts page does.
        </p>
      </section>
    </div>
  </AppLayout>
</template>
