<script setup lang="ts">
import { Link, useForm, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import DemoLink from '../../components/DemoLink.vue'
import AppLayout from '../../layouts/AppLayout.vue'

const page = usePage()
const flash = computed(() => page.flash as { message?: string; demoLink?: string } | undefined)
const form = useForm({ email: '' })

function submit() {
  form.post('/forgot-password')
}
</script>

<template>
  <AppLayout title="Forgot your password" description="A signed link, good for an hour and for one password">
    <div v-if="flash?.message" role="status" class="mb-4 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {{ flash.message }}
    </div>
    <DemoLink :href="flash?.demoLink" label="Reset link" />

    <form class="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="submit">
      <label class="block">
        <span class="font-medium text-slate-700">Email</span>
        <input
          v-model="form.email"
          type="email"
          autocomplete="username"
          :class="[
            'mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500',
            form.errors.email ? 'border-red-400' : 'border-slate-300',
          ]"
        />
        <span v-if="form.errors.email" class="mt-1 block text-xs text-red-600">{{ form.errors.email }}</span>
      </label>

      <div class="mt-5 flex items-center gap-3">
        <button
          type="submit"
          :disabled="form.processing"
          class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ form.processing ? 'Sending…' : 'Send reset link' }}
        </button>
        <Link href="/login" class="text-blue-600 hover:underline">Back to log in</Link>
      </div>
    </form>
  </AppLayout>
</template>
