<script setup lang="ts">
import { Link, router } from 'nestjs-mvc/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string }>()

const EVENTS = ['before', 'start', 'progress', 'success', 'error', 'exception', 'invalid', 'finish', 'navigate', 'prefetching', 'prefetched', 'flash'] as const
const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

const log = ref<string[]>([])
const blockExternal = ref(false)

const push = (line: string) => {
  log.value = [`${new Date().toLocaleTimeString()} ${line}`, ...log.value].slice(0, 14)
}

let offs: (() => void)[] = []
onMounted(() => {
  offs = EVENTS.map((name) =>
    router.on(name as never, ((event: CustomEvent<Record<string, unknown>>) => {
      const d = event.detail ?? {}
      const visit = d.visit as { url?: URL; method?: string } | undefined
      const extra = visit?.url ? `${visit.method?.toUpperCase()} ${visit.url.pathname}${visit.url.search}` : d.page ? `page ${(d.page as { component: string }).component}` : ''
      push(`${name.padEnd(11)} ${extra}`)
      // `before` may cancel a visit by returning false.
      if (name === 'before' && blockExternal.value && visit?.url?.pathname.includes('/slow')) {
        push('before      → cancelled (returned false)')
        return false
      }
    }) as never),
  )
})
onUnmounted(() => offs.forEach((off) => off()))
</script>

<template>
  <AppLayout title="Global Events" description="router.on(...) for every step of a visit; return false from `before` to cancel">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          Listeners registered with <code class="rounded bg-slate-100 px-1">router.on(name, fn)</code> (they return an unsubscribe function) or as <code class="rounded bg-slate-100 px-1">inertia:name</code> DOM events. This page logs them all. Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <Link href="/features/events/slow?ms=1200" :class="btn">visit a slow page (1.2 s)</Link>
          <Link href="/features/events/slow?ms=300&fail=1" :class="btn">visit a page that throws</Link>
          <button :class="btn" @click="router.reload({ only: ['renderedAt'] })">reload()</button>
          <Link href="/features/events/callbacks" prefetch="click" :class="btn">prefetch on mousedown</Link>
        </div>
        <label class="mt-4 flex items-center gap-2 text-xs">
          <input v-model="blockExternal" type="checkbox" />
          cancel visits to /slow from the <code class="rounded bg-slate-100 px-1">before</code> listener
        </label>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Event log</h2>
        <ul class="mt-2 font-mono text-xs text-slate-600">
          <li v-for="(line, i) in log" :key="i" class="whitespace-pre">{{ line }}</li>
          <li v-if="log.length === 0" class="font-sans text-slate-400">click something</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
