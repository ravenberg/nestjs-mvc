<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string }>()

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50'

const log = ref<string[]>([])
const busy = ref(false)
let cancelToken: { cancel: () => void } | null = null

const push = (line: string) => {
  log.value = [`${new Date().toLocaleTimeString()} ${line}`, ...log.value].slice(0, 12)
}

const visit = (url: string, extra: Record<string, unknown> = {}) =>
  router.visit(url, {
    // Keep this component (and its log) when the visit lands on this same page.
    preserveState: true,
    ...extra,
    onBefore: (v) => {
      push(`onBefore ${v.url.pathname}${v.url.search}`)
      return true
    },
    onCancelToken: (token) => {
      cancelToken = token
    },
    onStart: () => {
      busy.value = true
      push('onStart')
    },
    onProgress: (p) => {
      if (p) push(`onProgress ${p.percentage ?? '?'}%`)
    },
    onSuccess: (page) => push(`onSuccess → ${page.component}`),
    onError: (errors) => push(`onError ${JSON.stringify(errors)}`),
    onHttpException: (response) => {
      push(`onHttpException ${response.status}`)
      return false // handled here: no error dialog
    },
    onCancel: () => push('onCancel'),
    onFinish: () => {
      busy.value = false
      push('onFinish')
    },
  })

function startThenCancel() {
  visit('/features/events/slow?ms=3000')
  setTimeout(() => cancelToken?.cancel(), 500)
}
</script>

<template>
  <AppLayout title="Visit Callbacks" description="Per-visit lifecycle hooks, next to the global events">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          Every <code class="rounded bg-slate-100 px-1">router.visit()</code>, form submit and <code class="rounded bg-slate-100 px-1">&lt;Link&gt;</code> accepts callbacks for its own lifecycle. The same names as the global events, scoped to one visit. Because this demo configures <code class="rounded bg-slate-100 px-1">errorPages</code>, a 404 or 500 arrives as a page (onSuccess); <code class="rounded bg-slate-100 px-1">onHttpException</code> fires for statuses without one, or when you leave the option out. Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button :disabled="busy" :class="btn" @click="visit('/features/events/callbacks', { only: ['renderedAt'] })">partial reload of this page</button>
          <button :disabled="busy" :class="btn" @click="visit('/features/events/slow?ms=1500')">slow visit (1.5 s)</button>
          <button :disabled="busy" :class="btn" @click="visit('/features/events/slow?ms=300&fail=1')">visit that throws (500 → errorPages, so still onSuccess)</button>
          <button :disabled="busy" :class="btn" @click="visit('/features/errors/http/404')">404 (same: the error page is a page)</button>
          <button :disabled="busy" :class="btn" @click="startThenCancel">start, then cancel it via the cancel token</button>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Callback log</h2>
        <ul class="mt-2 font-mono text-xs text-slate-600">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
          <li v-if="log.length === 0" class="font-sans text-slate-400">click something</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
