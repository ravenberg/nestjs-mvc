<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'

defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 font-sans text-slate-900">
    <Sidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="border-b border-slate-200 bg-white px-8 py-5">
        <h1 class="text-lg font-semibold">{{ title }}</h1>
        <p v-if="description" class="mt-0.5 text-sm text-slate-500">{{ description }}</p>
      </header>
      <main class="flex-1 p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
