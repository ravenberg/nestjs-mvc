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
  log.value = [`${new Date().toLocaleTimeString()} ${line}`, ...log.value].slice(0, 10)
}

const attempt = (url: string, label: string) =>
  router.visit(url, {
    onCancelToken: (token) => {
      cancelToken = token
    },
    onStart: () => {
      busy.value = true
      push(`${label}: started`)
    },
    onSuccess: () => push(`${label}: success`),
    onHttpException: (r) => {
      push(`${label}: onHttpException ${r.status}`)
      return false
    },
    onNetworkError: (error) => {
      push(`${label}: onNetworkError — ${error.message}`)
      return false // handled: no dialog
    },
    onFinish: () => {
      busy.value = false
    },
  })

function hangThenCancel() {
  attempt('/features/errors/network/hang', 'hanging request')
  setTimeout(() => {
    cancelToken?.cancel()
    push('hanging request: cancelled after 3 s (cancel token)')
  }, 3000)
}
</script>

<template>
  <AppLayout title="Network Errors" description="When the server is unreachable, or never answers">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          An HTTP error still has a response; a network error has none. Inertia reports the second kind through <code class="rounded bg-slate-100 px-1">onNetworkError</code> and the global <code class="rounded bg-slate-100 px-1">exception</code> event. Return <code class="rounded bg-slate-100 px-1">false</code> to handle it yourself instead of the dialog. Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button :disabled="busy" :class="btn" @click="attempt('http://localhost:1/nothing', 'unreachable port')">visit an unreachable host</button>
          <button :disabled="busy" :class="btn" @click="hangThenCancel">visit a route that never answers, cancel after 3 s</button>
          <button :disabled="busy" :class="btn" @click="attempt('/features/errors/http/503', '503')">503 for contrast (answered by errorPages: a page, so success)</button>
        </div>
        <p class="mt-4 text-xs text-slate-500">Real-world equivalents: airplane mode, a deploy restarting the server, a proxy timing out. The page you were on stays intact either way.</p>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Log</h2>
        <ul class="mt-2 font-mono text-xs text-slate-600">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
          <li v-if="log.length === 0" class="font-sans text-slate-400">click something</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
