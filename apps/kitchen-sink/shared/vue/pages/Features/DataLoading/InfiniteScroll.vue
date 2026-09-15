<script setup lang="ts">
import { InfiniteScroll, Link } from 'nestjs-mvc/vue'
import ScrollEdge from '../../../components/data-loading/ScrollEdge.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface NoteRow {
  id: number
  body: string
  createdAt: string
  user: string
  contact: { id: number; name: string }
}

defineProps<{
  notes: {
    data: NoteRow[]
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    previousPage: number | null
    nextPage: number | null
  }
}>()
</script>

<template>
  <AppLayout
    title="Infinite Scroll"
    :description="`${notes.total} notes, ${notes.perPage} per page, landed on page ${notes.currentPage} of ${notes.lastPage}`"
  >
    <p class="mb-4 max-w-2xl text-sm text-slate-600">
      This page lands mid-way, so both ends load as you scroll. Reaching the bottom sends a partial reload for the next page and the server labels it under <code class="rounded bg-slate-100 px-1">mergeProps</code>; reaching the top sends <code class="mx-1 rounded bg-slate-100 px-1">X-Inertia-Infinite-Scroll-Merge-Intent: prepend</code>and it comes back under <code class="rounded bg-slate-100 px-1">prependProps</code>, with your scroll position kept. Watch the Network tab: no navigation, only partial requests with a page number.
    </p>

    <InfiniteScroll data="notes" :buffer="150">
      <template #previous="{ loading, hasMore }">
        <ScrollEdge :loading="loading" :has-more="hasMore" more="Scroll up for newer notes" done="Newest notes reached" />
      </template>
      <template #next="{ loading, hasMore }">
        <ScrollEdge :loading="loading" :has-more="hasMore" more="Scroll down for older notes" done="Oldest notes reached" />
      </template>
      <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        <li v-for="note in notes.data" :key="note.id" class="px-5 py-3">
          <p class="text-sm text-slate-800">{{ note.body }}</p>
          <p class="mt-1 text-xs text-slate-500">#{{ note.id }} · {{ note.user }} on <Link :href="`/contacts/${note.contact.id}`" class="hover:underline">{{ note.contact.name }}</Link> · {{ new Date(note.createdAt).toLocaleDateString() }}</p>
        </li>
      </ul>
    </InfiniteScroll>
  </AppLayout>
</template>
