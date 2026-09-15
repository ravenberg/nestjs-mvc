<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { Deferred, InfiniteScroll, Link } from 'nestjs-mvc/vue'
import AppLayout from '../../layouts/AppLayout.vue'

interface ContactRow {
  id: number
  name: string
  email: string | null
  isFavorite: boolean
}

defineProps<{
  organization: { id: number; name: string; city: string | null }
  /** Deferred *and* scrollable: absent on the first render, then paged by cursor. */
  contacts?: { data: ContactRow[]; nextPage: number | null }
}>()
</script>

<template>
  <AppLayout :title="organization.name" :description="organization.city ?? undefined">
    <section class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Contacts</h2>
      <p class="text-sm text-slate-500">
        Deferred, so the header renders without waiting on this query; then loaded four at a time with a keyset cursor (<code class="rounded bg-slate-100 px-1">?cursor=&lt;id&gt;</code>).
      </p>

      <Deferred data="contacts">
        <template #fallback>
          <div class="mt-4 space-y-2">
            <div v-for="i in [0, 1, 2, 3]" :key="i" class="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </template>
        <InfiniteScroll data="contacts" manual>
          <template #next="{ fetch, hasMore, loading }">
            <button
              v-if="hasMore"
              type="button"
              :disabled="loading"
              class="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              @click="fetch()"
            >
              {{ loading ? 'Loading…' : 'Load more' }}
            </button>
          </template>
          <ul class="mt-4 divide-y divide-slate-100">
            <li v-for="contact in contacts?.data" :key="contact.id" class="flex items-center justify-between py-2.5">
              <Link :href="`/contacts/${contact.id}`" class="flex items-center gap-2 text-sm font-medium hover:underline">
                <Star v-if="contact.isFavorite" class="size-4 fill-amber-400 text-amber-500" />
                {{ contact.name }}
              </Link>
              <span class="text-sm text-slate-500">{{ contact.email }}</span>
            </li>
            <li v-if="contacts?.data.length === 0" class="py-3 text-sm text-slate-500">No contacts in this organization.</li>
          </ul>
        </InfiniteScroll>
      </Deferred>
    </section>
  </AppLayout>
</template>
