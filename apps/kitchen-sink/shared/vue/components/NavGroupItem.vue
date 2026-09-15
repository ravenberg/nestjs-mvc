<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { Link } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import type { NavGroup } from '../../navigation'
import { icons, isActive } from './navigation'

const props = defineProps<{ group: NavGroup; currentUrl: string }>()

// Open when the current page is inside it; the sidebar remounts on every visit.
const open = ref(props.group.items?.some((item) => isActive(props.currentUrl, item.href)) ?? false)
</script>

<template>
  <li>
    <button
      type="button"
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      @click="open = !open"
    >
      <component :is="icons[group.icon]" class="size-4 shrink-0 text-slate-500" />
      <span class="flex-1 text-left">{{ group.label }}</span>
      <ChevronRight :class="['size-4 text-slate-400 transition-transform', open ? 'rotate-90' : '']" />
    </button>

    <ul v-if="open" class="mt-1 ml-7 space-y-0.5 border-l border-slate-200 pl-3">
      <template v-for="item in group.items" :key="item.label">
        <li v-if="item.href">
          <Link
            :href="item.href"
            :class="[
              'block rounded-md px-2 py-1.5 text-sm',
              isActive(currentUrl, item.href) ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-100',
            ]"
          >
            {{ item.label }}
          </Link>
        </li>
        <li v-else title="Not built yet" class="cursor-not-allowed px-2 py-1.5 text-sm text-slate-400">{{ item.label }}</li>
      </template>
    </ul>
  </li>
</template>
