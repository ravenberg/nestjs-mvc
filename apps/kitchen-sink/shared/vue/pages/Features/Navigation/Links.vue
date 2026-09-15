<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Received {
  id: number
  method: string
  payload: unknown
  at: string
}

defineProps<{ tab: string; received: Received[] }>()

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50'
const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
</script>

<template>
  <AppLayout title="Links & Methods" description="<Link> for GET navigation, and for POST/PUT/PATCH/DELETE without a form">
    <div v-if="flash" class="mb-4 max-w-3xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">GET links</h2>
        <p class="mt-1 text-slate-600">
          A <code class="rounded bg-slate-100 px-1">&lt;Link&gt;</code> is an anchor that visits with XHR: the page object swaps in, the URL updates, no reload. Cmd-click still opens a tab.
        </p>
        <div class="mt-3 flex gap-2">
          <Link
            v-for="t in ['overview', 'details', 'history']"
            :key="t"
            :href="`/features/navigation/links?tab=${t}`"
            :class="[btn, tab === t ? 'border-blue-400 bg-blue-50 text-blue-700' : '']"
          >
            {{ t }}
          </Link>
        </div>
        <p class="mt-2 text-xs text-slate-500">Current tab prop: {{ tab }}</p>

        <h2 class="mt-6 font-semibold">Links with a method</h2>
        <p class="mt-1 text-slate-600">
          <code class="rounded bg-slate-100 px-1">method</code> and <code class="rounded bg-slate-100 px-1">data</code> turn a link into a request; <code class="rounded bg-slate-100 px-1">as="button"</code> keeps the markup honest. After PUT, PATCH and DELETE the adapter redirects with 303, so the follow-up is a GET.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Link href="/features/navigation/links/items" method="post" :data="{ title: 'New item' }" as="button" :class="btn">POST</Link>
          <Link href="/features/navigation/links/items/7" method="put" :data="{ title: 'Replaced' }" as="button" :class="btn">PUT</Link>
          <Link href="/features/navigation/links/items/7" method="patch" :data="{ title: 'Patched' }" as="button" :class="btn">PATCH</Link>
          <Link href="/features/navigation/links/items/7" method="delete" as="button" :class="[btn, 'text-red-700']">DELETE</Link>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Received by the server</h2>
        <ul class="mt-2 divide-y divide-slate-100 font-mono text-xs">
          <li v-for="r in received" :key="r.id" class="flex gap-3 py-1.5">
            <span class="w-14 font-semibold">{{ r.method }}</span>
            <span class="flex-1 truncate text-slate-600">{{ JSON.stringify(r.payload) }}</span>
            <span class="text-slate-400">{{ new Date(r.at).toLocaleTimeString() }}</span>
          </li>
          <li v-if="received.length === 0" class="py-2 font-sans text-slate-500">Nothing yet. Click a method button.</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
