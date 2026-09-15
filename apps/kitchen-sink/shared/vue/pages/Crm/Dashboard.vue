<script setup lang="ts">
import { Deferred, Link, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import DemoLink from '../../components/DemoLink.vue'
import AppLayout from '../../layouts/AppLayout.vue'

interface Activity {
  id: number
  body: string
  createdAt: string
  user: { id: number; name: string }
  contact: { id: number; name: string }
}

const props = defineProps<{
  /** A once prop: resolved on the first visit, then kept by the client. */
  you: { name: string; notes: number }
  totalContacts?: number
  totalOrganizations?: number
  recentNotesCount?: number
  recentActivity: Activity[]
}>()

const page = usePage<{ auth?: { user?: { verified?: boolean } | null } }>()
const flash = computed(() => page.flash as { message?: string; demoLink?: string } | undefined)
const verified = computed(() => page.props.auth?.user?.verified ?? true)

// The three counters are deferred: each shows a placeholder until its prop arrives.
const stats = computed(() => [
  { label: 'Total Contacts', data: 'totalContacts', value: props.totalContacts },
  { label: 'Organizations', data: 'totalOrganizations', value: props.totalOrganizations },
  { label: 'Notes This Week', data: 'recentNotesCount', value: props.recentNotesCount },
])
</script>

<template>
  <AppLayout title="Dashboard" :description="`Welcome back, ${you.name}. You have written ${you.notes} notes.`">
    <div v-if="flash?.message" role="status" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {{ flash.message }}
    </div>
    <DemoLink :href="flash?.demoLink" label="Verification link" />
    <div
      v-if="!verified"
      class="mb-6 flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span>Your email address is not verified yet.</span>
      <Link
        href="/verify-email/resend"
        method="post"
        as="button"
        class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100"
      >
        Send a new link
      </Link>
    </div>

    <div class="grid gap-6 sm:grid-cols-3">
      <div v-for="stat in stats" :key="stat.data" class="rounded-xl border border-slate-200 bg-white p-6">
        <p class="text-sm text-slate-600">{{ stat.label }}</p>
        <Deferred :data="stat.data">
          <template #fallback>
            <div class="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200" />
          </template>
          <p class="mt-2 text-4xl font-semibold tabular-nums">{{ stat.value }}</p>
        </Deferred>
      </div>
    </div>

    <section class="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Recent Activity</h2>
      <p class="text-sm text-slate-500">Latest notes added across all contacts</p>

      <ul class="mt-4 divide-y divide-slate-100">
        <li v-for="activity in recentActivity" :key="activity.id" class="flex items-start justify-between gap-4 py-3">
          <div class="min-w-0">
            <!-- Inline elements on one line: Vue drops whitespace that contains a newline. -->
            <p class="text-sm">
              <span class="font-medium">{{ activity.user.name }}</span> <span class="text-slate-500">added a note on</span> <Link :href="`/contacts/${activity.contact.id}`" class="text-blue-600 hover:underline">{{ activity.contact.name }}</Link>
            </p>
            <p class="mt-0.5 truncate text-sm text-slate-500">{{ activity.body }}</p>
          </div>
          <time class="shrink-0 text-xs text-slate-400">{{ new Date(activity.createdAt).toLocaleDateString('en-GB') }}</time>
        </li>
      </ul>
    </section>
  </AppLayout>
</template>
