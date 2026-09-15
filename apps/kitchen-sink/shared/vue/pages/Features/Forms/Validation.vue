<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

defineProps<{ messages: string[] }>()

const form = useForm({ message: '' })

function submit() {
  form.post('/features/forms/validation', { onSuccess: () => form.reset() })
}
</script>

<template>
  <AppLayout title="Validation" description="Server-side validation errors delivered through the redirect-back flow">
    <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
      <p class="text-sm text-slate-600">
        Submitting fewer than 3 characters throws a <code class="rounded bg-slate-100 px-1">ValidationException</code> on the server. The adapter flashes the errors, redirects back, and exposes them as the <code class="rounded bg-slate-100 px-1">errors</code> prop — no session middleware required.
      </p>

      <form class="mt-4 flex gap-2" @submit.prevent="submit">
        <input
          v-model="form.message"
          placeholder="Type something…"
          class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          :disabled="form.processing"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <p v-if="form.errors.message" class="mt-2 text-sm text-red-600">{{ form.errors.message }}</p>

      <ul class="mt-6 divide-y divide-slate-100">
        <li v-for="(message, i) in messages" :key="i" class="py-2 text-sm">{{ message }}</li>
        <li v-if="messages.length === 0" class="py-2 text-sm text-slate-500">No messages yet.</li>
      </ul>
    </section>
  </AppLayout>
</template>
