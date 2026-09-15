<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'

/**
 * The demo has no mailer, so links that would be emailed are shown here
 * instead. A real app must not: it would tell anyone whether an address exists.
 */
defineProps<{ href?: string; label: string }>()
</script>

<template>
  <div v-if="href" class="mb-4 max-w-xl rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm">
    <p class="font-medium text-amber-900">{{ label }} (a real app sends this by email)</p>
    <Link :href="href" class="mt-1 block break-all text-blue-700 underline">{{ href }}</Link>
  </div>
</template>
