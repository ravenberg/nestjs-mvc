<script setup lang="ts">
defineProps<{ on: boolean; label: string }>()
</script>

<template>
  <span :class="['rounded-full px-2 py-0.5 text-xs', on ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500']">{{ label }}: {{ String(on) }}</span>
</template>
