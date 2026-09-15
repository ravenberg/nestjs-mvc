<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import AppLayout from './AppLayout.vue'

/**
 * A persistent layout: pages name it with `defineOptions({ layout })`, so Vue
 * keeps this component mounted while the page inside it changes. The counter and
 * the clock below prove it: they would restart on every visit otherwise.
 * `title`, `theme` and `accent` can be set by the page through layout props.
 */
withDefaults(defineProps<{ title?: string; theme?: 'light' | 'dark' | 'ocean'; accent?: string }>(), {
  title: 'Persistent layout',
  theme: 'light',
  accent: undefined,
})

const page = usePage()
const seconds = ref(0)
const visits = ref(0)

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => seconds.value++, 1000)
})
onUnmounted(() => clearInterval(timer))

// Counts page swaps inside this layout without remounting it.
watch(
  () => page.url,
  () => {
    visits.value++
  },
  { immediate: true },
)

const themes = {
  light: 'border-slate-200 bg-white text-slate-900',
  dark: 'border-slate-700 bg-slate-900 text-slate-100',
  ocean: 'border-cyan-300 bg-cyan-50 text-cyan-950',
}
</script>

<template>
  <AppLayout :title="title" description="This frame stays mounted across visits; only the page inside it changes">
    <div :class="['max-w-3xl rounded-xl border p-5', themes[theme]]" :style="accent ? { boxShadow: `inset 4px 0 0 ${accent}` } : undefined">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
        <span>layout mounted for <strong class="tabular-nums">{{ seconds }}s</strong> · pages shown inside it: <strong>{{ visits }}</strong> · theme {{ theme }}</span>
        <span class="flex gap-2">
          <Link href="/features/layouts/persistent/first" class="underline">first</Link>
          <Link href="/features/layouts/persistent/second" class="underline">second</Link>
          <Link href="/features/layouts/persistent/third" class="underline">third</Link>
          <Link href="/features/layouts/props/dark" class="underline">props: dark</Link>
        </span>
      </div>
      <div class="mt-4">
        <slot />
      </div>
    </div>
  </AppLayout>
</template>
