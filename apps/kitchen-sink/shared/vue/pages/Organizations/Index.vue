<script setup lang="ts">
import { Link, router } from 'nestjs-mvc/vue'
import { ref } from 'vue'
import AppLayout from '../../layouts/AppLayout.vue'

const props = defineProps<{
  organizations: { id: number; name: string; city: string | null; contactCount: number }[]
  filters: { search: string }
}>()

const search = ref(props.filters.search)

function submit() {
  router.get('/organizations', search.value ? { search: search.value } : {}, { preserveState: true, replace: true })
}
</script>

<template>
  <AppLayout title="Organizations" :description="`${organizations.length} organizations`">
    <form class="mb-4" @submit.prevent="submit">
      <input
        v-model="search"
        placeholder="Search organizations…"
        class="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </form>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        v-for="organization in organizations"
        :key="organization.id"
        :href="`/organizations/${organization.id}`"
        class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
      >
        <p class="font-medium">{{ organization.name }}</p>
        <p class="mt-1 text-sm text-slate-500">{{ organization.city ?? '—' }}</p>
        <p class="mt-3 text-xs text-slate-400">{{ organization.contactCount }} {{ organization.contactCount === 1 ? 'contact' : 'contacts' }}</p>
      </Link>
    </div>
  </AppLayout>
</template>
