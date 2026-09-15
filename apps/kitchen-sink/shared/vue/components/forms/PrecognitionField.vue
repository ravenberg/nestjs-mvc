<script setup lang="ts">
/** A labelled input for the Precognition page: "…" while its check runs, a check mark once it passed. */
withDefaults(defineProps<{ label: string; type?: string; error?: string; valid: boolean; validating: boolean }>(), { type: 'text' })
const emit = defineEmits<{ blur: [] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="mt-3 block">
    <span class="font-medium text-slate-700">{{ label }}</span>
    <span class="relative mt-1 block">
      <input
        v-model="model"
        :type="type"
        :class="[
          'block w-full rounded-lg border px-3 py-2 pr-8 outline-none focus:border-blue-500',
          error ? 'border-red-400' : valid ? 'border-green-400' : 'border-slate-300',
        ]"
        @blur="emit('blur')"
      />
      <span class="absolute top-2 right-3 text-xs"><template v-if="validating">…</template><span v-else-if="valid && !error" class="text-green-600">✓</span></span>
    </span>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
