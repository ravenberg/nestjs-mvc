<script setup lang="ts">
import { useForm, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import Flag from '../../../components/forms/Flag.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Message {
  id: number
  author: string
  body: string
  sentAt: string
}

defineProps<{ messages: Message[] }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)

const form = useForm({ author: '', body: '' })
// A second form on the same page: its errors live under their own bag, so a
// failure here never touches `form.hasErrors` above.
const pw = useForm({ password: '' })
// The server sends every message for this field; the client type says string.
const passwordErrors = computed(() => ([] as string[]).concat((pw.errors.password as unknown as string | string[] | undefined) ?? []))

// Runs on submit, on the data about to be sent, without touching the inputs.
form.transform((data) => ({ ...data, body: data.body.trim() }))

function sendMessage() {
  form.post('/features/forms/use-form/messages', { onSuccess: () => form.reset() })
}

function checkPassword() {
  pw.post('/features/forms/use-form/password', { errorBag: 'password', onSuccess: () => pw.reset() })
}
</script>

<template>
  <AppLayout title="useForm" description="The form helper: data, errors, processing, transform, reset — and the two server paths">
    <div v-if="flash" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="sendMessage">
        <p class="text-slate-600">
          <code class="rounded bg-slate-100 px-1">useForm()</code> keeps the data, sends it, and receives the <code class="rounded bg-slate-100 px-1">errors</code> prop after the redirect back. The server side is a handler with a Zod schema; it never learns which helper submitted.
        </p>

        <label class="mt-4 block">
          <span class="font-medium text-slate-700">Name</span>
          <input
            v-model="form.author"
            :class="['mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500', form.errors.author ? 'border-red-400' : 'border-slate-300']"
          />
          <span v-if="form.errors.author" class="mt-1 block text-xs text-red-600">{{ form.errors.author }}</span>
        </label>

        <label class="mt-3 block">
          <span class="font-medium text-slate-700">Message</span>
          <textarea
            v-model="form.body"
            rows="3"
            :class="['mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500', form.errors.body ? 'border-red-400' : 'border-slate-300']"
          />
          <span v-if="form.errors.body" class="mt-1 block text-xs text-red-600">{{ form.errors.body }}</span>
        </label>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="submit"
            :disabled="form.processing"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ form.processing ? 'Sending…' : 'Send' }}
          </button>
          <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50" @click="form.reset()">Reset</button>
          <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50" @click="form.clearErrors()">Clear errors</button>
        </div>

        <div class="mt-4 flex flex-wrap gap-1">
          <Flag :on="form.isDirty" label="isDirty" />
          <Flag :on="form.processing" label="processing" />
          <Flag :on="form.hasErrors" label="hasErrors" />
          <Flag :on="form.wasSuccessful" label="wasSuccessful" />
          <Flag :on="form.recentlySuccessful" label="recentlySuccessful" />
        </div>
      </form>

      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm md:col-span-2" @submit.prevent="checkPassword">
        <h2 class="font-semibold">All messages per field</h2>
        <p class="mt-1 text-slate-600">
          By default the first message per field is sent, like Laravel. This handler flattens with <code class="rounded bg-slate-100 px-1">{ messages: 'all' }</code> and the field arrives as an array. It also posts with <code class="rounded bg-slate-100 px-1">errorBag: 'password'</code>, so its errors are scoped away from the form above.
        </p>
        <div class="mt-3 flex items-start gap-2">
          <div class="flex-1">
            <input
              v-model="pw.password"
              placeholder="Try: password"
              :class="['block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500', passwordErrors.length ? 'border-red-400' : 'border-slate-300']"
            />
            <ul v-if="passwordErrors.length > 0" class="mt-1 list-disc pl-5 text-xs text-red-600">
              <li v-for="m in passwordErrors" :key="m">{{ m }}</li>
            </ul>
          </div>
          <button
            type="submit"
            :disabled="pw.processing"
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Check
          </button>
        </div>
      </form>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Messages</h2>
        <ul class="mt-2 divide-y divide-slate-100">
          <li v-for="m in messages" :key="m.id" class="py-2">
            <p>{{ m.body }}</p>
            <p class="text-xs text-slate-500">{{ m.author }} · {{ new Date(m.sentAt).toLocaleTimeString() }}</p>
          </li>
          <li v-if="messages.length === 0" class="py-2 text-slate-500">Nothing yet. Submit the form empty first to see the errors.</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
