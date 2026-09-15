<script setup lang="ts">
import { Form, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Subscriber {
  id: number
  name: string
  email: string
  plan: string
  subscribedAt: string
}

defineProps<{ subscribers: Subscriber[] }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)

const plans = ['free', 'team', 'enterprise']
const input = (error?: string) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-300'}`
</script>

<template>
  <AppLayout title="Form Component" description="No state on the client: the <Form> reads the DOM, submits, and hands you errors and status">
    <div v-if="flash" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <Form
        v-slot="{ errors, processing, wasSuccessful, isDirty }"
        action="/features/forms/form-component/subscribe"
        method="post"
        :reset-on-success="true"
        class="rounded-xl border border-slate-200 bg-white p-6 text-sm"
      >
        <p class="text-slate-600">
          Plain inputs with <code class="rounded bg-slate-100 px-1">name</code> attributes; the <code class="rounded bg-slate-100 px-1">&lt;Form&gt;</code> serialises them, posts as an Inertia visit and exposes the result as slot props. Same handler shape as everywhere: a Zod schema and <code class="rounded bg-slate-100 px-1">back()</code>.
        </p>

        <label class="mt-4 block">
          <span class="font-medium text-slate-700">Name</span>
          <input name="name" :class="input(errors.name)" />
          <span v-if="errors.name" class="mt-1 block text-xs text-red-600">{{ errors.name }}</span>
        </label>

        <label class="mt-3 block">
          <span class="font-medium text-slate-700">Email</span>
          <input name="email" type="email" :class="input(errors.email)" />
          <span v-if="errors.email" class="mt-1 block text-xs text-red-600">{{ errors.email }}</span>
        </label>

        <fieldset class="mt-3">
          <legend class="font-medium text-slate-700">Plan</legend>
          <div class="mt-1 flex gap-4">
            <label v-for="plan in plans" :key="plan" class="flex items-center gap-1"><input type="radio" name="plan" :value="plan" /> {{ plan }}</label>
          </div>
          <span v-if="errors.plan" class="mt-1 block text-xs text-red-600">{{ errors.plan }}</span>
        </fieldset>

        <label class="mt-3 flex items-center gap-2"><input type="checkbox" name="terms" value="true" /> I accept the terms</label>
        <span v-if="errors.terms" class="mt-1 block text-xs text-red-600">{{ errors.terms }}</span>

        <div class="mt-4 flex items-center gap-3">
          <button
            type="submit"
            :disabled="processing"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ processing ? 'Subscribing…' : 'Subscribe' }}
          </button>
          <span class="text-xs text-slate-500">isDirty {{ String(isDirty) }} · wasSuccessful {{ String(wasSuccessful) }}</span>
        </div>
      </Form>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Subscribers</h2>
        <ul class="mt-2 divide-y divide-slate-100">
          <li v-for="s in subscribers" :key="s.id" class="flex justify-between py-2">
            <span>{{ s.name }} <span class="text-slate-500">· {{ s.email }}</span></span>
            <span class="rounded-full bg-slate-100 px-2 text-xs">{{ s.plan }}</span>
          </li>
          <li v-if="subscribers.length === 0" class="py-2 text-slate-500">No one yet.</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
