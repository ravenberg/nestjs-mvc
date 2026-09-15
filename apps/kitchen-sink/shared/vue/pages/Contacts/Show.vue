<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { Deferred, Link } from 'nestjs-mvc/vue'
import AppLayout from '../../layouts/AppLayout.vue'

interface Note {
  id: number
  body: string
  createdAt: string
  user: { id: number; name: string }
}

defineProps<{
  contact: {
    id: number
    name: string
    email: string | null
    phone: string | null
    isFavorite: boolean
    organization: { id: number; name: string } | null
  }
  notes?: Note[]
}>()
</script>

<template>
  <AppLayout :title="contact.name">
    <div class="grid gap-6 lg:grid-cols-3">
      <section class="rounded-xl border border-slate-200 bg-white p-6">
        <div class="flex items-center gap-2">
          <h2 class="font-semibold">{{ contact.name }}</h2>
          <Star v-if="contact.isFavorite" class="size-4 fill-amber-400 text-amber-500" />
        </div>
        <dl class="mt-4 space-y-3 text-sm">
          <div>
            <dt class="text-slate-500">Email</dt>
            <dd>{{ contact.email ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Phone</dt>
            <dd>{{ contact.phone ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Organization</dt>
            <dd>
              <Link v-if="contact.organization" :href="`/organizations/${contact.organization.id}`" class="text-blue-600 hover:underline">{{ contact.organization.name }}</Link>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <h2 class="font-semibold">Notes</h2>
        <p class="text-sm text-slate-500">A <code class="rounded bg-slate-100 px-1">defer()</code> prop — the profile paints first, notes stream in right after.</p>

        <Deferred data="notes">
          <template #fallback>
            <div class="mt-4 space-y-3">
              <div v-for="i in [0, 1, 2]" :key="i" class="h-12 animate-pulse rounded-lg bg-slate-100" />
            </div>
          </template>
          <ul class="mt-4 divide-y divide-slate-100">
            <li v-for="note in notes" :key="note.id" class="py-3">
              <div class="flex items-baseline justify-between gap-4">
                <p class="text-sm font-medium">{{ note.user.name }}</p>
                <time class="text-xs text-slate-400">{{ new Date(note.createdAt).toLocaleDateString('en-GB') }}</time>
              </div>
              <p class="mt-0.5 text-sm text-slate-600">{{ note.body }}</p>
            </li>
            <li v-if="notes?.length === 0" class="py-3 text-sm text-slate-500">No notes yet.</li>
          </ul>
        </Deferred>
      </section>
    </div>
  </AppLayout>
</template>
