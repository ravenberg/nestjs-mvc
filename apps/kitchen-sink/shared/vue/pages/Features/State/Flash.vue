<script setup lang="ts">
import { Link, router, usePage } from 'nestjs-mvc/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Toast {
  level: string
  title: string
  body: string
}

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

const page = usePage()
const flash = computed(() => (page.flash ?? {}) as Record<string, unknown>)
const message = computed(() => flash.value.message as string | undefined)
const toast = computed(() => flash.value.toast as Toast | undefined)
const status = computed(() => flash.value.status as string | undefined)
const log = ref<string[]>([])

// The `flash` event fires whenever a response carries flash data: a good
// place for a toast system that lives outside any page component.
let stopListening: (() => void) | undefined
onMounted(() => {
  stopListening = router.on('flash', (event) => {
    log.value = [`${new Date().toLocaleTimeString()} flash event: ${Object.keys(event.detail.flash).join(', ')}`, ...log.value].slice(0, 8)
  })
})
onUnmounted(() => stopListening?.())
</script>

<template>
  <AppLayout title="Flash Data" description="One-shot data from the server: on the next render, then gone">
    <div v-if="message" class="mb-3 max-w-3xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ message }}</div>
    <div
      v-if="toast"
      :class="[
        'mb-3 max-w-3xl rounded-xl border px-4 py-3 text-sm',
        toast.level === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800',
      ]"
    >
      <strong>{{ toast.title }}</strong> — {{ toast.body }} <span v-if="status" class="ml-2 rounded-full bg-white/60 px-2 text-xs">status: {{ status }}</span>
    </div>

    <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          <code class="rounded bg-slate-100 px-1">view.flash(key, value)</code> in a handler; the page object carries <code class="rounded bg-slate-100 px-1">flash</code> on the next render and the client clears it from history, so Back never replays it. It travels in the same client-held bag as validation errors: no session.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button :class="btn" @click="router.post('/features/state/flash/message')">POST → flash a message</button>
          <button :class="btn" @click="router.post('/features/state/flash/structured', { level: 'info' })">POST → structured</button>
          <button :class="`${btn} text-red-700`" @click="router.post('/features/state/flash/structured', { level: 'error' })">POST → structured (error)</button>
          <Link href="/features/state/flash/render" :class="btn">GET that flashes on its own render</Link>
          <button :class="btn" @click="router.flash('message', 'Set on the client with router.flash(); same page.flash, no request.')">router.flash() client-side</button>
          <Link href="/features/state/flash" :class="btn">Plain visit (nothing flashed)</Link>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Current page.flash</h2>
        <pre class="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs">{{ JSON.stringify(flash, null, 2) }}</pre>
        <h2 class="mt-4 font-semibold">router.on('flash') log</h2>
        <ul class="mt-1 text-xs tabular-nums text-slate-600">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
          <li v-if="log.length === 0" class="text-slate-400">no events yet</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
