<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 1 })
</script>

<template>
  <div class="space-y-2">
    <div v-for="i in lines" :key="i" class="h-5 animate-pulse rounded bg-slate-100" />
  </div>
</template>
