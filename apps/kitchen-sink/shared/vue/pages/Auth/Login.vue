<script setup lang="ts">
import { Link, useForm, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import AppLayout from '../../layouts/AppLayout.vue'

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
const form = useForm({ email: '', password: '', remember: false })

const input = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

function submit() {
  form.post('/login', { onFinish: () => form.reset('password') })
}
</script>

<template>
  <AppLayout title="Log in" description="The CRM needs a login; every feature page works without one.">
    <div v-if="flash" class="mb-4 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <form class="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="submit">
      <label class="block">
        <span class="font-medium text-slate-700">Email</span>
        <input v-model="form.email" type="email" autocomplete="username" :class="input(!!form.errors.email)" />
        <span v-if="form.errors.email" class="mt-1 block text-xs text-red-600">{{ form.errors.email }}</span>
      </label>

      <label class="mt-3 block">
        <span class="font-medium text-slate-700">Password</span>
        <input v-model="form.password" type="password" autocomplete="current-password" :class="input(!!form.errors.password)" />
        <span v-if="form.errors.password" class="mt-1 block text-xs text-red-600">{{ form.errors.password }}</span>
      </label>

      <label class="mt-3 flex items-center gap-2 text-slate-700">
        <input v-model="form.remember" type="checkbox" />
        Remember me
      </label>

      <div class="mt-5 flex items-center gap-3">
        <button
          type="submit"
          :disabled="form.processing"
          class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ form.processing ? 'Logging in…' : 'Log in' }}
        </button>
        <Link href="/register" class="text-blue-600 hover:underline">Register instead</Link>
        <Link href="/forgot-password" class="text-slate-600 hover:underline">Forgot your password?</Link>
      </div>

      <p class="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Seeded users: <code>test@example.com</code>, <code>user1@example.com</code> … <code>user3@example.com</code>, all with the password <code>password</code>.
      </p>
    </form>
  </AppLayout>
</template>
