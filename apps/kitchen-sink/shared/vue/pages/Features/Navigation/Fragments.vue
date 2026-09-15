<script setup lang="ts">
import { router, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ savedAt: string }>()

const SECTIONS = ['profile', 'security', 'billing'] as const

const page = usePage()
const message = computed(() => page.flash?.message as string | undefined)
</script>

<template>
  <AppLayout title="URL Fragments" description="Redirects that land on a section, and forms that keep you on one">
    <div v-if="message" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ message }}</div>

    <section class="mb-4 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        An XHR follows a redirect without its <code class="rounded bg-slate-100 px-1">#fragment</code>. Two fixes in the protocol. <strong>Redirect to a section:</strong> the handler redirects to <code class="rounded bg-slate-100 px-1">/…#security</code>; the adapter answers <code class="rounded bg-slate-100 px-1">409</code> + <code class="rounded bg-slate-100 px-1">X-Inertia-Redirect</code> and the client visits it, fragment included. <strong>Stay on a section:</strong> a form on <code class="rounded bg-slate-100 px-1">#billing</code> posts and redirects back; the handler calls <code class="rounded bg-slate-100 px-1">preserveFragment()</code>, the page object carries <code class="rounded bg-slate-100 px-1">preserveFragment: true</code>, and the URL keeps <code class="rounded bg-slate-100 px-1">#billing</code>. Watch the address bar and the Network tab.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="section in SECTIONS"
          :key="section"
          class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
          @click="router.post('/features/navigation/fragments/jump', { to: section })"
        >
          Redirect to #{{ section }}
        </button>
      </div>
    </section>

    <section
      v-for="section in SECTIONS"
      :id="section"
      :key="section"
      class="mb-4 max-w-2xl scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm target:border-blue-400 target:ring-2 target:ring-blue-100"
      style="min-height: 60vh"
    >
      <h2 class="font-semibold capitalize">{{ section }}</h2>
      <p class="mt-1 text-slate-500">#{{ section }} · last saved {{ new Date(savedAt).toLocaleTimeString() }}</p>
      <button
        class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        @click="router.post(`/features/navigation/fragments/save#${section}`, { section }, { preserveScroll: true })"
      >
        Save {{ section }} (preserveFragment)
      </button>
    </section>
  </AppLayout>
</template>
