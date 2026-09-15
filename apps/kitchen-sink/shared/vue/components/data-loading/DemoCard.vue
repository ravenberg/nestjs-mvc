<script setup lang="ts">
/** A card with a title and the server call it demonstrates. */
defineProps<{ title: string; code: string }>()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4">
    <h2 class="text-sm font-semibold">{{ title }}</h2>
    <code class="mt-1 block text-xs text-slate-500">{{ code }}</code>
    <div class="mt-3 text-sm">
      <slot />
    </div>
  </section>
</template>
