<script setup lang="ts">
import { WhenVisible } from 'nestjs-mvc/vue'

defineProps<{ name: string; section?: { name: string; loadedAt: string }; always?: boolean }>()
</script>

<template>
  <section class="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm" style="min-height: 70vh">
    <h2 class="font-semibold">{{ name }} <span v-if="always" class="text-xs font-normal text-slate-500">(always: refetched every time it scrolls into view)</span></h2>
    <div class="mt-3">
      <WhenVisible :data="name" :buffer="100" :always="always">
        <template #fallback>
          <div class="space-y-2">
            <div class="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
            <div class="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
            <div class="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </template>
        <template #default="{ fetching }">
          <p>{{ section ? `Loaded "${section.name}" at ${new Date(section.loadedAt).toLocaleTimeString()}` : 'Waiting…' }}<span v-if="fetching" class="ml-2 text-blue-600">refreshing…</span></p>
        </template>
      </WhenVisible>
    </div>
  </section>
</template>
