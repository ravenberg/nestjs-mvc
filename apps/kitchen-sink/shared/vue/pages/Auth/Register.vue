<script setup lang="ts">
import { Link, useForm } from 'nestjs-mvc/vue'
import AppLayout from '../../layouts/AppLayout.vue'

type Field = 'name' | 'email' | 'password' | 'password_confirmation'

const fields: { name: Field; label: string; type: string; autocomplete: string }[] = [
  { name: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'username' },
  { name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  { name: 'password_confirmation', label: 'Confirm password', type: 'password', autocomplete: 'new-password' },
]

const form = useForm({ name: '', email: '', password: '', password_confirmation: '' })

const input = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

function submit() {
  form.post('/register', { onFinish: () => form.reset('password', 'password_confirmation') })
}
</script>

<template>
  <AppLayout title="Register" description="An account of your own in the demo CRM.">
    <form class="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="submit">
      <label v-for="(field, index) in fields" :key="field.name" :class="['block', index > 0 ? 'mt-3' : '']">
        <span class="font-medium text-slate-700">{{ field.label }}</span>
        <input v-model="form[field.name]" :type="field.type" :autocomplete="field.autocomplete" :class="input(!!form.errors[field.name])" />
        <span v-if="form.errors[field.name]" class="mt-1 block text-xs text-red-600">{{ form.errors[field.name] }}</span>
      </label>

      <div class="mt-5 flex items-center gap-3">
        <button
          type="submit"
          :disabled="form.processing"
          class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ form.processing ? 'Creating…' : 'Create account' }}
        </button>
        <Link href="/login" class="text-blue-600 hover:underline">Log in instead</Link>
      </div>
    </form>
  </AppLayout>
</template>
