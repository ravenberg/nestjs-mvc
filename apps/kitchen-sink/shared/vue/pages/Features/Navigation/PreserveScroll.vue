<script setup lang="ts">
import { Link } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface City {
  id: number
  name: string
}

defineProps<{ highlight: number | null; cities: City[] }>()
</script>

<template>
  <AppLayout title="Preserve Scroll" description="A visit normally scrolls to the top; preserveScroll keeps you where you are">
    <section class="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
      <p class="text-slate-600">
        Scroll down and click a city. The left button visits with <code class="rounded bg-slate-100 px-1">preserveScroll</code>: the props change (the row highlights) and the page stays put. The right button is a plain visit: same props, but Inertia resets the scroll position to the top, as a browser navigation would.
      </p>
      <p class="mt-2 text-xs text-slate-500">
        Highlighted: {{ highlight ?? 'none' }} · also useful for <code class="rounded bg-slate-100 px-1">router.reload()</code> and form submits that redirect back to a long page.
      </p>
    </section>

    <ul class="max-w-3xl divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      <li
        v-for="city in cities"
        :key="city.id"
        :class="['flex items-center justify-between px-5 py-3 text-sm', highlight === city.id ? 'bg-blue-50' : '']"
      >
        <span :class="highlight === city.id ? 'font-semibold text-blue-700' : ''">{{ city.id }}. {{ city.name }}</span>
        <span class="flex gap-2">
          <Link
            :href="`/features/navigation/preserve-scroll?highlight=${city.id}`"
            preserve-scroll
            class="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
          >
            preserveScroll
          </Link>
          <Link :href="`/features/navigation/preserve-scroll?highlight=${city.id}`" class="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
            plain visit
          </Link>
        </span>
      </li>
    </ul>
  </AppLayout>
</template>
