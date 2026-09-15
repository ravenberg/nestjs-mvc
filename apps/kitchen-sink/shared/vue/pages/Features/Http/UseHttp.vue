<script setup lang="ts">
import { useHttp } from 'nestjs-mvc/vue'
import { onUnmounted, watch } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface SearchResponse {
  query: string
  results: string[]
  at: string
}

interface EchoResponse {
  received: { name: string; amount: number }
  total: number
  at: string
}

defineProps<{ renderedAt: string }>()

// A GET that returns JSON, not a page: no visit, no page swap.
const search = useHttp<{ q: string }, SearchResponse>('get', '/features/http/cities', { q: '' })
// A POST with the same helper surface as useForm: fields, errors, processing, response.
const echo = useHttp<{ name: string; amount: string }, EchoResponse>('post', '/features/http/echo', { name: '', amount: '' })

// Search 250 ms after the last keystroke, and once on mount.
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => search.q,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => search.submit(), 250)
  },
  { immediate: true },
)
onUnmounted(() => clearTimeout(timer))

const input = (error?: unknown) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-300'}`
</script>

<template>
  <AppLayout title="useHttp" description="Talk to a JSON endpoint from an Inertia page, with the form ergonomics you already know">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Typeahead (GET)</h2>
        <p class="mt-1 text-slate-600">
          Not every request is a page. <code class="rounded bg-slate-100 px-1">useHttp()</code> calls an ordinary Nest handler without <code class="rounded bg-slate-100 px-1">@View()</code> and gives you the JSON; the page stays as it is. Rendered at {{ new Date(renderedAt).toLocaleTimeString() }}.
        </p>
        <input v-model="search.q" placeholder="Type a city…" :class="`${input()} mt-3`" />
        <ul class="mt-2 min-h-24 divide-y divide-slate-100">
          <li v-for="c in search.response?.results ?? []" :key="c" class="py-1">{{ c }}</li>
          <li v-if="search.response && search.response.results.length === 0" class="py-1 text-slate-400">no match</li>
        </ul>
        <p class="text-xs text-slate-500">
          {{ search.processing ? 'searching…' : search.response ? `${search.response.results.length} results at ${new Date(search.response.at).toLocaleTimeString()}` : '' }}
        </p>
      </section>

      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="echo.submit()">
        <h2 class="font-semibold">Mutation (POST) with validation</h2>
        <p class="mt-1 text-slate-600">
          Errors arrive like a form's. The handler validates with the same global pipe as every form; because the module sets <code class="rounded bg-slate-100 px-1">validation.jsonStatus: 422</code>, a non-Inertia failure is answered <code class="rounded bg-slate-100 px-1">422</code> + <code class="rounded bg-slate-100 px-1">{ errors }</code> (the Laravel convention this client expects) and <code class="rounded bg-slate-100 px-1">echo.errors</code> fills in. Success lands in <code class="rounded bg-slate-100 px-1">echo.response</code>.
        </p>
        <label class="mt-3 block">
          <span class="text-slate-700">Name</span>
          <input v-model="echo.name" :class="input(echo.errors.name)" />
          <span v-if="echo.errors.name" class="mt-1 block text-xs text-red-600">{{ echo.errors.name }}</span>
        </label>
        <label class="mt-3 block">
          <span class="text-slate-700">Amount (excl. VAT)</span>
          <input v-model="echo.amount" :class="input(echo.errors.amount)" />
          <span v-if="echo.errors.amount" class="mt-1 block text-xs text-red-600">{{ echo.errors.amount }}</span>
        </label>
        <button
          type="submit"
          :disabled="echo.processing"
          class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ echo.processing ? 'Sending…' : 'Send JSON' }}
        </button>
        <pre v-if="echo.response" class="mt-4 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{{ JSON.stringify(echo.response, null, 2) }}</pre>
      </form>
    </div>
  </AppLayout>
</template>
