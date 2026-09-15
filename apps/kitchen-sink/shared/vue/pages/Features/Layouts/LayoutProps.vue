<script setup lang="ts">
import { Link, setLayoutProps } from 'nestjs-mvc/vue'
import PersistentLayout from '../../../layouts/PersistentLayout.vue'

// The component form: the adapter passes the layout-props store into it.
defineOptions({ layout: PersistentLayout })

const props = defineProps<{ theme: 'light' | 'dark' | 'ocean'; renderedAt: string }>()

const ACCENTS: Record<string, string> = { light: '#2563eb', dark: '#f59e0b', ocean: '#0891b2' }
const themes = ['light', 'dark', 'ocean'] as const

// The page tells its persistent layout what to look like, without owning it.
setLayoutProps({ title: `Layout Props · ${props.theme}`, theme: props.theme, accent: ACCENTS[props.theme] })
</script>

<template>
  <div class="text-sm">
    <p>Theme <strong>{{ theme }}</strong>, rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.</p>
    <p class="mt-2 opacity-80">
      The layout is persistent (see the clock), yet each page can change how it looks: <code class="rounded bg-black/5 px-1">setLayoutProps({ title, theme, accent })</code> feeds props to the layout component that <code class="rounded bg-black/5 px-1">defineOptions({ layout })</code> named, and they are reset on the next page that does not set them.
    </p>
    <div class="mt-4 flex gap-2">
      <Link
        v-for="t in themes"
        :key="t"
        :href="`/features/layouts/props/${t}`"
        :class="['rounded-lg border px-3 py-1.5', t === theme ? 'border-current font-medium' : 'border-current/30 hover:border-current']"
      >
        {{ t }}
      </Link>
    </div>
  </div>
</template>
