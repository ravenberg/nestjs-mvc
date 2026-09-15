<script setup lang="ts">
import { useForm, usePage } from 'nestjs-mvc/vue'
import { computed } from 'vue'
import DottedKeysField from '../../../components/forms/DottedKeysField.vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Submission {
  user: { name: string; email: string }
  address: { city: string; postcode: string }
  tags: string[]
}

defineProps<{ submissions: Submission[] }>()

const page = usePage()
const message = computed(() => page.flash?.message as string | undefined)

// The (method, url, data) signature turns on Precognition: `validate()` posts
// to the same endpoint with `Precognition: true`, and the server answers with
// the same schema's verdict without running the handler.
const form = useForm('post', '/features/forms/dotted-keys', {
  user: { name: '', email: '' },
  address: { city: '', postcode: '' },
  tags: ['', ''],
})

// Errors arrive keyed by dot path, exactly as Standard Schema reports them.
const errors = computed(() => form.errors as Record<string, string | undefined>)
const valid = (name: string) => form.valid(name as never)
const validate = (name: string) => form.validate(name as never)

function submit() {
  form.submit({ onSuccess: () => form.reset() })
}
</script>

<template>
  <AppLayout title="Dotted Keys" description="Nested form data validated by a Zod schema, live and on submit">
    <div v-if="message" class="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {{ message }}
    </div>

    <form class="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6" @submit.prevent="submit">
      <p class="text-sm text-slate-600">
        The handler is <code class="rounded bg-slate-100 px-1">@Body({ schema })</code> with a Zod schema, validated by NestJS v12's <code class="rounded bg-slate-100 px-1">StandardSchemaValidationPipe</code>. Leave a field to validate it live (<strong>Precognition</strong>: the same endpoint, the same schema, a <code class="rounded bg-slate-100 px-1">Precognition: true</code> header, and the handler never runs), or submit it empty to see every error at once.<span v-if="form.validating" class="ml-2 text-blue-600">Validating…</span>
      </p>

      <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">user.*</legend>
        <DottedKeysField v-model="form.user.name" label="Name" :error="errors['user.name']" :valid="valid('user.name')" @blur="validate('user.name')" />
        <DottedKeysField v-model="form.user.email" label="Email" :error="errors['user.email']" :valid="valid('user.email')" @blur="validate('user.email')" />
      </fieldset>

      <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">address.*</legend>
        <DottedKeysField v-model="form.address.city" label="City" :error="errors['address.city']" :valid="valid('address.city')" @blur="validate('address.city')" />
        <DottedKeysField
          v-model="form.address.postcode"
          label="Postcode"
          placeholder="1234 AB"
          :error="errors['address.postcode']"
          :valid="valid('address.postcode')"
          @blur="validate('address.postcode')"
        />
      </fieldset>

      <fieldset class="grid gap-4 md:grid-cols-2">
        <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">tags.N</legend>
        <DottedKeysField
          v-for="(_, i) in form.tags"
          :key="i"
          v-model="form.tags[i]"
          :label="`Tag ${i + 1}`"
          :error="errors[`tags.${i}`]"
          :valid="valid(`tags.${i}`)"
          @blur="validate(`tags.${i}`)"
        />
        <p v-if="errors.tags" class="text-xs text-red-600 md:col-span-2">{{ errors.tags }}</p>
      </fieldset>

      <button
        type="submit"
        :disabled="form.processing"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Save contact
      </button>
    </form>

    <section class="mt-6 max-w-2xl">
      <h2 class="text-sm font-semibold text-slate-500">Accepted submissions</h2>
      <ul class="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        <li v-for="(s, i) in submissions" :key="i" class="px-4 py-2 text-sm">
          <span class="font-medium">{{ s.user.name }}</span> · {{ s.user.email }} · {{ s.address.postcode }} {{ s.address.city }}<span v-if="s.tags.filter(Boolean).length > 0" class="text-slate-500"> · {{ s.tags.filter(Boolean).join(', ') }}</span>
        </li>
        <li v-if="submissions.length === 0" class="px-4 py-3 text-sm text-slate-500">Nothing accepted yet.</li>
      </ul>
    </section>
  </AppLayout>
</template>
