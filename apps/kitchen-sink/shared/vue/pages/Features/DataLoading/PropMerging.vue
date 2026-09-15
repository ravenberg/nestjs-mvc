<script setup lang="ts">
import { router } from 'nestjs-mvc/vue'
import DemoCard from '../../../components/data-loading/DemoCard.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Item {
  id: number
  label: string
  stamp: string
  count?: number
}

const props = defineProps<{
  tick: number
  appended: Item[]
  prepended: Item[]
  matched: Item[]
  deep: { counts: Record<string, number>; items: { id: number; seen: number; stamp: string }[] }
}>()

const ALL = ['appended', 'prepended', 'matched', 'deep']

const next = (only: string[]) => router.reload({ data: { tick: props.tick + 1 }, only: [...only, 'tick'] })
const reset = () => router.reload({ data: { tick: 0 }, only: [...ALL, 'tick'], reset: ALL })
</script>

<template>
  <AppLayout title="Prop Merging" :description="`Four strategies for combining a partial reload with what the client has · tick ${tick}`">
    <p class="mb-4 max-w-3xl text-sm text-slate-600">
      Every button does a partial reload with <code class="rounded bg-slate-100 px-1">tick + 1</code>. The server sends one new item per prop; the page object's <code class="rounded bg-slate-100 px-1">mergeProps</code>, <code class="rounded bg-slate-100 px-1">prependProps</code>, <code class="rounded bg-slate-100 px-1">deepMergeProps</code> and <code class="rounded bg-slate-100 px-1">matchPropsOn</code> tell the client how to combine it. Reset sends <code class="rounded bg-slate-100 px-1">X-Inertia-Reset</code> and the client replaces instead.
    </p>

    <div class="mb-4 flex flex-wrap gap-2">
      <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="next(ALL)">Reload all (tick {{ tick + 1 }})</button>
      <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="reset">Reset</button>
    </div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <DemoCard title="Appended" code="merge(() => [item])">
        <ul class="divide-y divide-slate-100">
          <li v-for="item in appended" :key="`${item.id}-${item.stamp}`" class="py-1">{{ item.label }} <span class="text-slate-400">· {{ item.stamp }}</span></li>
        </ul>
        <button class="mt-2 text-xs text-blue-600 hover:underline" @click="next(['appended'])">append one</button>
      </DemoCard>

      <DemoCard title="Prepended" code="prepend(() => [item])">
        <ul class="divide-y divide-slate-100">
          <li v-for="item in prepended" :key="`${item.id}-${item.stamp}`" class="py-1">{{ item.label }} <span class="text-slate-400">· {{ item.stamp }}</span></li>
        </ul>
        <button class="mt-2 text-xs text-blue-600 hover:underline" @click="next(['prepended'])">prepend one</button>
      </DemoCard>

      <DemoCard title="Matched on id" code="merge(() => [...], { matchOn: 'id' })">
        <ul class="divide-y divide-slate-100">
          <li v-for="item in matched" :key="item.id" class="flex justify-between py-1">
            <span>#{{ item.id }} {{ item.label }}</span>
            <span class="tabular-nums text-slate-500">count {{ item.count }}</span>
          </li>
        </ul>
        <p class="mt-2 text-xs text-slate-500">#1 is re-sent every time with a new count: updated in place, never duplicated.</p>
        <button class="mt-1 text-xs text-blue-600 hover:underline" @click="next(['matched'])">send again</button>
      </DemoCard>

      <DemoCard title="Deep merged" code="deepMerge(() => ({ counts, items }), { matchOn: 'items.id' })">
        <p class="text-xs text-slate-500">counts (keys accumulate, total is replaced)</p>
        <code class="block text-xs">{{ JSON.stringify(deep.counts) }}</code>
        <p class="mt-2 text-xs text-slate-500">items (matched on id inside the object)</p>
        <ul class="divide-y divide-slate-100">
          <li v-for="item in deep.items" :key="item.id" class="flex justify-between py-1">
            <span>#{{ item.id }}</span>
            <span class="tabular-nums text-slate-500">seen {{ item.seen }}</span>
          </li>
        </ul>
        <button class="mt-2 text-xs text-blue-600 hover:underline" @click="next(['deep'])">merge again</button>
      </DemoCard>
    </div>
  </AppLayout>
</template>
