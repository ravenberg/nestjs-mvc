<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'

/** The inner of a nested layout pair: a tab strip that persists across its section pages. */
defineProps<{ current?: string }>()

const tabs = ['overview', 'members', 'settings']
</script>

<template>
  <div>
    <nav class="flex gap-1 border-b border-slate-200 text-sm">
      <Link
        v-for="tab in tabs"
        :key="tab"
        :href="`/features/layouts/nested/${tab}`"
        :class="[
          '-mb-px border-b-2 px-3 py-2',
          current === tab ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800',
        ]"
      >
        {{ tab }}
      </Link>
    </nav>
    <div class="pt-4">
      <slot />
    </div>
  </div>
</template>
