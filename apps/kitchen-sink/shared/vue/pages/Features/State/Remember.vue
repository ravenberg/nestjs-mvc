<script setup lang="ts">
import { Link, useRemember } from 'nestjs-mvc/vue'
import { reactive, ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string }>()

// A reactive object in gives a reactive object back, so v-model binds its fields directly.
const remembered = useRemember(reactive({ query: '', sort: 'name', open: true }), 'filters') as {
  query: string
  sort: string
  open: boolean
}
// Plain component state: lost when the component remounts.
const forgotten = ref({ query: '' })

const input = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500'
</script>

<template>
  <AppLayout title="Remember" description="Component state that survives a visit away and the Back button">
    <section class="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        Inertia keeps page props in <code class="rounded bg-slate-100 px-1">history.state</code>, not your component's local state. <code class="rounded bg-slate-100 px-1">useRemember(initial, key)</code> stores that state in the history entry too, so it comes back with Back — the way a browser restores a form on a normal page. Fill in the left form, <Link href="/dashboard" class="text-blue-700 underline">visit the Dashboard</Link>, press Back.
      </p>
      <p class="mt-2 text-xs text-slate-500">Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}. Nothing is sent to the server.</p>
    </section>

    <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
      <section class="rounded-xl border border-green-200 bg-white p-5 text-sm">
        <h2 class="font-semibold">useRemember</h2>
        <label class="mt-3 block">
          <span class="text-slate-700">Search</span>
          <input v-model="remembered.query" :class="input" />
        </label>
        <label class="mt-3 block">
          <span class="text-slate-700">Sort</span>
          <select v-model="remembered.sort" :class="input">
            <option value="name">name</option>
            <option value="date">date</option>
            <option value="size">size</option>
          </select>
        </label>
        <label class="mt-3 flex items-center gap-2">
          <input v-model="remembered.open" type="checkbox" />
          Panel open
        </label>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-5 text-sm">
        <h2 class="font-semibold">Without useRemember (for contrast)</h2>
        <label class="mt-3 block">
          <span class="text-slate-700">Search</span>
          <input v-model="forgotten.query" :class="input" />
        </label>
        <p class="mt-3 text-xs text-slate-500">Gone after Back: the component remounts with its initial state.</p>
      </section>
    </div>
  </AppLayout>
</template>
