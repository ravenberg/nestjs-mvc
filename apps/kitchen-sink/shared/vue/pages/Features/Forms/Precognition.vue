<script setup lang="ts">
import { useForm, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import PrecognitionField from '../../../components/forms/PrecognitionField.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Registration {
  id: number
  name: string
  email: string
  registeredAt: string
}

defineProps<{ registrations: Registration[] }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)

// (method, url, data) turns on precognition: validate() posts to the same
// endpoint with `Precognition: true`; the handler never runs.
const form = useForm('post', '/features/forms/precognition/register', { name: '', email: '', password: '' })

function submit() {
  form.submit({ onSuccess: () => form.reset() })
}
</script>

<template>
  <AppLayout title="Precognition" description="Validate a field the moment the user leaves it, against the real endpoint and its real rules">
    <div v-if="flash" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="submit">
        <p class="text-slate-600">
          Try <code class="rounded bg-slate-100 px-1">ada@example.com</code>: the email is taken, and the server says so before you submit. That rule needs the database, so it lives in the Zod schema as an async <code class="rounded bg-slate-100 px-1">refine</code> — precognition runs the schema without running the handler. One set of rules, no validation endpoint.
        </p>

        <PrecognitionField
          v-model="form.name"
          label="Name"
          :error="form.errors.name"
          :valid="form.valid('name')"
          :validating="form.validating && form.touched('name')"
          @blur="form.validate('name')"
        />
        <PrecognitionField
          v-model="form.email"
          label="Email"
          type="email"
          :error="form.errors.email"
          :valid="form.valid('email')"
          :validating="form.validating && form.touched('email')"
          @blur="form.validate('email')"
        />
        <PrecognitionField
          v-model="form.password"
          label="Password"
          type="password"
          :error="form.errors.password"
          :valid="form.valid('password')"
          :validating="form.validating && form.touched('password')"
          @blur="form.validate('password')"
        />

        <button
          type="submit"
          :disabled="form.processing || form.validating"
          class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Register
        </button>
      </form>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Registered</h2>
        <ul class="mt-2 divide-y divide-slate-100">
          <li v-for="r in registrations" :key="r.id" class="py-2">{{ r.name }} <span class="text-slate-500">· {{ r.email }}</span></li>
        </ul>
        <p class="mt-4 text-xs text-slate-500">
          Network tab: each blur is a POST to the register endpoint with <code class="rounded bg-slate-100 px-1">Precognition: true</code> and <code class="rounded bg-slate-100 px-1">Precognition-Validate-Only</code>, answered 204 or 422.
        </p>
      </section>
    </div>
  </AppLayout>
</template>
