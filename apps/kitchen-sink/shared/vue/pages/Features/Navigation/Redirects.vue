<script setup lang="ts">
import { Link, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ from: string | null }>()

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50'
const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
</script>

<template>
  <AppLayout title="Redirects" description="Every kind of redirect the adapter produces, and what the client does with each">
    <div v-if="flash" class="mb-4 max-w-3xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <section class="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        Handlers never touch <code class="rounded bg-slate-100 px-1">res</code>: they <code class="rounded bg-slate-100 px-1">return this.view.redirect(url)</code>, <code class="rounded bg-slate-100 px-1">back()</code> or <code class="rounded bg-slate-100 px-1">location(url)</code>, and the adapter picks the status and headers the protocol wants. Arrived from: <strong>{{ from ?? 'nowhere yet' }}</strong>.
      </p>

      <table class="mt-4 w-full text-left">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-1 font-medium">Handler</th>
            <th class="py-1 font-medium">Wire</th>
            <th class="py-1 font-medium">Try</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr>
            <td class="py-2"><code>redirect('/…?from=internal')</code></td>
            <td class="py-2 text-slate-600">302 + Location; the client follows it as a visit</td>
            <td class="py-2"><Link href="/features/navigation/redirects/internal" :class="btn">internal</Link></td>
          </tr>
          <tr>
            <td class="py-2"><code>back()</code></td>
            <td class="py-2 text-slate-600">302 to the Referer</td>
            <td class="py-2"><Link href="/features/navigation/redirects/back" :class="btn">back</Link></td>
          </tr>
          <tr>
            <td class="py-2"><code>redirect(…)</code> after PUT</td>
            <td class="py-2 text-slate-600">303, so the browser makes a GET instead of replaying the PUT</td>
            <td class="py-2"><Link href="/features/navigation/redirects/put" method="put" as="button" :class="btn">put</Link></td>
          </tr>
          <tr>
            <td class="py-2"><code>location('https://…')</code></td>
            <td class="py-2 text-slate-600">409 + X-Inertia-Location; the client does a full page load</td>
            <td class="py-2"><Link href="/features/navigation/redirects/external" :class="btn">external</Link></td>
          </tr>
          <tr>
            <td class="py-2"><code>redirect('/…#section')</code></td>
            <td class="py-2 text-slate-600">409 + X-Inertia-Redirect; the client visits it with the fragment</td>
            <td class="py-2"><Link href="/features/navigation/fragments" :class="btn">see URL Fragments</Link></td>
          </tr>
        </tbody>
      </table>
      <p class="mt-3 text-xs text-slate-500">Watch the Network tab for the status codes; the flash message names what happened.</p>
    </section>
  </AppLayout>
</template>
