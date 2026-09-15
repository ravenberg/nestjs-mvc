<script setup lang="ts">
import { usePoll } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Metrics {
  serverTime: string
  activeUsers: number
  queueDepth: number
  resolvedAt: string
}

const props = defineProps<{ interval: number; metrics: Metrics }>()

const ticks = ref(0)
const { start, stop, polling } = usePoll(props.interval, { only: ['metrics'], onSuccess: () => ticks.value++ }, { keepAlive: false })
</script>

<template>
  <AppLayout title="Polling" description="Reload some props on an interval, and stop when the tab is hidden">
    <div class="grid max-w-4xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p class="text-slate-600">
          <code class="rounded bg-slate-100 px-1">usePoll({{ interval }}, { only: ['metrics'] })</code> issues a partial reload every {{ interval / 1000 }} s for one prop. Without <code class="rounded bg-slate-100 px-1">keepAlive</code> it pauses while the tab is in the background. The server keeps no state: the numbers derive from the clock.
        </p>
        <div class="mt-4 flex items-center gap-2">
          <button
            :disabled="polling"
            class="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            @click="start"
          >
            Start
          </button>
          <button :disabled="!polling" class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50" @click="stop">
            Stop
          </button>
          <span :class="['ml-2 rounded-full px-2 py-0.5 text-xs', polling ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500']">{{ polling ? 'polling' : 'stopped' }} · {{ ticks }} responses</span>
        </div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <dl class="grid grid-cols-2 gap-y-3">
          <dt class="text-slate-500">Server time</dt>
          <dd class="tabular-nums">{{ new Date(metrics.serverTime).toLocaleTimeString() }}</dd>
          <dt class="text-slate-500">Active users</dt>
          <dd class="text-2xl font-semibold tabular-nums">{{ metrics.activeUsers }}</dd>
          <dt class="text-slate-500">Queue depth</dt>
          <dd class="text-2xl font-semibold tabular-nums">{{ metrics.queueDepth }}</dd>
        </dl>
        <p class="mt-4 text-xs text-slate-500">Only the metrics prop travels on each poll; the page's other props stay as they were.</p>
      </section>
    </div>
  </AppLayout>
</template>
