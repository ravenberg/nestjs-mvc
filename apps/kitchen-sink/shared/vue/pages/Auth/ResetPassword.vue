<script setup lang="ts">
import { useForm } from 'nestjs-mvc/vue'
import AppLayout from '../../layouts/AppLayout.vue'

const props = defineProps<{
  email: string
  /** The signed URL this page was opened with; the form posts back to it. */
  action: string
}>()

const form = useForm({ password: '', password_confirmation: '' })

const input = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

function submit() {
  form.post(props.action)
}
</script>

<template>
  <AppLayout title="Choose a new password" :description="email">
    <form class="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="submit">
      <label class="block">
        <span class="font-medium text-slate-700">New password</span>
        <input v-model="form.password" type="password" autocomplete="new-password" :class="input(!!form.errors.password)" />
        <span v-if="form.errors.password" class="mt-1 block text-xs text-red-600">{{ form.errors.password }}</span>
      </label>

      <label class="mt-3 block">
        <span class="font-medium text-slate-700">Confirm password</span>
        <input
          v-model="form.password_confirmation"
          type="password"
          autocomplete="new-password"
          :class="input(!!form.errors.password_confirmation)"
        />
        <span v-if="form.errors.password_confirmation" class="mt-1 block text-xs text-red-600">{{ form.errors.password_confirmation }}</span>
      </label>

      <button
        type="submit"
        :disabled="form.processing"
        class="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {{ form.processing ? 'Saving…' : 'Save password' }}
      </button>

      <p class="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        The link that brought you here is signed and bound to your current password, so it stops working the moment this form succeeds.
      </p>
    </form>
  </AppLayout>
</template>
