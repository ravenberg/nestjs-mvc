<script setup lang="ts">
/** A labelled input for the Dotted Keys page: the error below it, a check mark once the server says it is valid. */
defineProps<{ label: string; error?: string; valid?: boolean; placeholder?: string }>()
const emit = defineEmits<{ blur: [] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="block text-sm">
    <span class="font-medium text-slate-700">{{ label }}</span>
    <span class="relative mt-1 block">
      <input
        v-model="model"
        :placeholder="placeholder"
        :class="[
          'block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500',
          error ? 'border-red-400' : valid ? 'border-green-400' : 'border-slate-300',
        ]"
        @blur="emit('blur')"
      />
      <span v-if="valid && !error" class="absolute top-2 right-3 text-green-600">✓</span>
    </span>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
