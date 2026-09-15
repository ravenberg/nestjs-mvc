<script setup lang="ts">
import { Link, progress, router } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ renderedAt: string }>()

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

function fakeJob() {
  progress.start()
  let n = 0
  const id = setInterval(() => {
    n += 0.2
    progress.set(n)
    if (n >= 1) {
      clearInterval(id)
      progress.finish()
    }
  }, 400)
}
</script>

<template>
  <AppLayout title="Progress" description="The progress bar at the top, and how to drive it yourself">
    <section class="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        The bar is NProgress, started by the client after a visit has been in flight for 250 ms (so quick visits never flash it) and finished with the response. Configured once in <code class="rounded bg-slate-100 px-1">createInertiaApp({ progress })</code> — the generated entry keeps the defaults. Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <Link href="/features/events/slow?ms=2000" :class="btn">2 s visit: bar shows</Link>
        <Link href="/features/events/slow?ms=100" :class="btn">100 ms visit: no bar</Link>
        <button :class="btn" @click="router.reload({ only: ['renderedAt'], showProgress: false })">reload with showProgress: false</button>
      </div>
      <h2 class="mt-5 font-semibold">Manual control</h2>
      <p class="mt-1 text-slate-600">For your own async work, the same bar:</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button :class="btn" @click="progress.start()">progress.start()</button>
        <button :class="btn" @click="progress.finish()">progress.finish()</button>
        <button :class="btn" @click="fakeJob">fake a 2 s job with progress.set()</button>
      </div>
    </section>
  </AppLayout>
</template>
