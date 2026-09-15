<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { InfiniteScroll, Link, router } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import AppLayout from '../../layouts/AppLayout.vue'

interface ContactRow {
  id: number
  name: string
  email: string | null
  phone: string | null
  isFavorite: boolean
  organization: { id: number; name: string } | null
}

const props = defineProps<{
  /** A `scroll()` prop: the rows under `data`, plus the paginator's cursor and totals. */
  contacts: {
    data: ContactRow[]
    total: number
    currentPage: number
    lastPage: number
    nextPage: number | null
  }
  filters: { search: string; favorite: boolean }
}>()

const search = ref(props.filters.search)

function apply(next: Partial<{ search: string; favorite: boolean }>) {
  const params: Record<string, string> = {}
  const merged = { search: search.value, favorite: props.filters.favorite, ...next }
  if (merged.search) params.search = merged.search
  if (merged.favorite) params.favorite = '1'
  // A partial visit that *resets* the scroll prop: the server answers with page 1,
  // unlabelled, and `scrollProps.contacts.reset` tells InfiniteScroll to start over.
  router.get('/contacts', params, {
    only: ['contacts', 'filters'],
    reset: ['contacts'],
    preserveState: true,
    replace: true,
  })
}
</script>

<template>
  <AppLayout title="Contacts" :description="`${contacts.total} contacts`">
    <form class="mb-4 flex gap-2" @submit.prevent="apply({})">
      <input
        v-model="search"
        placeholder="Search contacts…"
        class="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      <button
        type="button"
        :class="[
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
          filters.favorite ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50',
        ]"
        @click="apply({ favorite: !filters.favorite })"
      >
        <Star :class="['size-4', filters.favorite ? 'fill-amber-400 text-amber-500' : '']" />
        Favorites
      </button>
    </form>

    <!-- InfiniteScroll puts its attributes (this class) on the element around the rows, as in React. -->
    <InfiniteScroll data="contacts" :buffer="200" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <template #loading>
        <p class="py-3 text-center text-sm text-slate-500">Loading more…</p>
      </template>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-600">
          <tr>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Organization</th>
            <th class="px-4 py-3 font-medium">Email</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="contact in contacts.data" :key="contact.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <Link :href="`/contacts/${contact.id}`" class="flex items-center gap-2 font-medium">
                <Star v-if="contact.isFavorite" class="size-4 fill-amber-400 text-amber-500" />
                {{ contact.name }}
              </Link>
            </td>
            <td class="px-4 py-3 text-slate-600">
              <Link v-if="contact.organization" :href="`/organizations/${contact.organization.id}`" class="hover:underline">{{ contact.organization.name }}</Link>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ contact.email }}</td>
          </tr>
          <tr v-if="contacts.data.length === 0">
            <td :colspan="3" class="px-4 py-10 text-center text-slate-500">No contacts match your filters.</td>
          </tr>
        </tbody>
      </table>
    </InfiniteScroll>

    <p class="mt-3 text-xs text-slate-500">
      Showing {{ contacts.data.length }} of {{ contacts.total }}{{ contacts.nextPage === null ? ' — all loaded.' : ' — scroll for more.' }} Pages are appended by<code class="mx-1 rounded bg-slate-100 px-1">scroll()</code>through partial reloads; the URL follows the page in view.
    </p>
  </AppLayout>
</template>
