<script setup lang="ts">
import { usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ pageOnly: string }>()

const page = usePage()
const auth = computed(() => page.props.auth as { user?: { name: string; email: string } | null } | undefined)
const locale = computed(() => page.props.locale as { code: string; timezone: string } | undefined)
</script>

<template>
  <AppLayout title="Shared Props" description="Props every page gets, and how the client knows which ones they are">
    <section class="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        <code class="rounded bg-slate-100 px-1">auth.user</code> is added to every page by nestjs-mvc from <code class="rounded bg-slate-100 px-1">auth.share</code>, after the guards have run, and <code class="rounded bg-slate-100 px-1">auth.notifications</code> next to it by a middleware (the sidebar reads both); <code class="rounded bg-slate-100 px-1">locale</code> is shared by this page's handler with <code class="rounded bg-slate-100 px-1">view.share()</code>. The page object lists their keys under <code class="rounded bg-slate-100 px-1">sharedProps</code>, so when you click a sidebar link the client can keep them while it shows the next page's placeholder — the sidebar never blanks.
      </p>

      <dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt class="text-slate-500">sharedProps</dt>
        <dd>
          <!-- Vue's usePage() has no sharedProps; the full page object is $page. -->
          <code class="text-xs">{{ JSON.stringify($page.sharedProps ?? []) }}</code>
        </dd>
        <dt class="text-slate-500">auth.user</dt>
        <dd>{{ auth?.user ? `${auth.user.name} · ${auth.user.email}` : 'none' }}</dd>
        <dt class="text-slate-500">locale</dt>
        <dd>{{ locale ? `${locale.code} · ${locale.timezone}` : 'none' }}</dd>
        <dt class="text-slate-500">pageOnly</dt>
        <dd>{{ pageOnly }}</dd>
      </dl>

      <p class="mt-4 text-xs text-slate-500">
        Middleware shares through <code class="rounded bg-slate-100 px-1">requestState(req).shared</code>, handlers and guards through <code class="rounded bg-slate-100 px-1">ViewService.share()</code>; both end up in the same place. Set <code class="rounded bg-slate-100 px-1">exposeSharedProps: false</code> on the module to leave the list out.
      </p>
    </section>
  </AppLayout>
</template>
