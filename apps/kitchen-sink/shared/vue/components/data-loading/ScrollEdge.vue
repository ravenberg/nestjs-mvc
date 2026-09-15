<script setup lang="ts">
/** The strip at either end of the list: what is happening there, or that the end was reached. */
defineProps<{ loading: boolean; hasMore: boolean; more: string; done: string }>()
</script>

<template>
  <p :class="['py-3 text-center text-xs', loading ? 'text-blue-600' : 'text-slate-400']">{{ hasMore ? (loading ? 'Loading…' : more) : done }}</p>
</template>
