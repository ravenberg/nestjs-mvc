<script setup lang="ts">
import { useForm, usePage } from 'nestjs-mvc/vue'
import { computed, ref, watch } from 'vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Upload {
  id: number
  name: string
  type: string
  size: number
  caption: string
  uploadedAt: string
  url: string
}

/** `platform` picks how the server receives the file: the one part of this page that differs per platform. */
defineProps<{ uploads: Upload[]; platform: 'express' | 'fastify' }>()

const page = usePage()
const flash = computed(() => page.flash?.message as string | undefined)
const form = useForm<{ avatar: File | null; caption: string }>({ avatar: null, caption: '' })
const preview = ref<string | null>(null)

// A local preview before anything is sent; revoked when the file changes.
watch(
  () => form.avatar,
  (file, _previous, onCleanup) => {
    if (!file) {
      preview.value = null
      return
    }
    const url = URL.createObjectURL(file)
    preview.value = url
    onCleanup(() => URL.revokeObjectURL(url))
  },
)

function pick(event: Event) {
  form.avatar = (event.target as HTMLInputElement).files?.[0] ?? null
}

function upload() {
  form.post('/features/forms/file-uploads', { onSuccess: () => form.reset(), forceFormData: true })
}
</script>

<template>
  <AppLayout title="File Uploads" :description="`A File in the form data makes the visit multipart; Nest on ${platform === 'express' ? 'Express' : 'Fastify'} receives it`">
    <div v-if="flash" class="mb-4 max-w-5xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{{ flash }}</div>

    <div class="grid max-w-5xl gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="upload">
        <p class="text-slate-600">
          Put a <code class="rounded bg-slate-100 px-1">File</code> in the data and Inertia sends <code class="rounded bg-slate-100 px-1">multipart/form-data</code>. On the server, <template v-if="platform === 'express'"><code class="rounded bg-slate-100 px-1">@UseInterceptors(FileInterceptor('avatar'))</code> and <code class="rounded bg-slate-100 px-1">@UploadedFile()</code> (Nest's own tooling, Express only) hand the handler the file, and the text fields arrive in <code class="rounded bg-slate-100 px-1">@Body()</code> as usual.</template><template v-else><code class="rounded bg-slate-100 px-1">@fastify/multipart</code> parses it, and the handler reads the file and the text fields from <code class="rounded bg-slate-100 px-1">req.parts()</code>; Nest's <code class="rounded bg-slate-100 px-1">FileInterceptor</code> is Express only.</template> The image is kept in memory and served back by a plain route.
        </p>

        <label class="mt-4 block">
          <span class="font-medium text-slate-700">Image</span>
          <input
            type="file"
            accept="image/*"
            class="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
            @change="pick"
          />
          <span v-if="form.errors.avatar" class="mt-1 block text-xs text-red-600">{{ form.errors.avatar }}</span>
        </label>

        <div v-if="preview" class="mt-3 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
          <img :src="preview" alt="Preview" class="mx-auto max-h-48 rounded object-contain" />
          <p class="mt-1 text-center text-xs text-slate-500">Preview, not uploaded yet · {{ form.avatar?.name }} · {{ Math.round((form.avatar?.size ?? 0) / 1024) }} kB</p>
        </div>

        <label class="mt-3 block">
          <span class="font-medium text-slate-700">Caption</span>
          <input
            v-model="form.caption"
            :class="['mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500', form.errors.caption ? 'border-red-400' : 'border-slate-300']"
          />
          <span v-if="form.errors.caption" class="mt-1 block text-xs text-red-600">{{ form.errors.caption }}</span>
        </label>

        <div v-if="form.progress" class="mt-3">
          <div class="h-2 overflow-hidden rounded bg-slate-100">
            <div class="h-2 bg-blue-500 transition-all" :style="{ width: `${form.progress.percentage ?? 0}%` }" />
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ form.progress.percentage }}% uploaded</p>
        </div>

        <button
          type="submit"
          :disabled="form.processing"
          class="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ form.processing ? 'Uploading…' : 'Upload' }}
        </button>
      </form>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Gallery</h2>
        <p class="text-xs text-slate-500">Served from memory by GET /file-uploads/:id/image; the last twelve are kept.</p>
        <ul class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <li v-for="u in uploads" :key="u.id" class="overflow-hidden rounded-lg border border-slate-200">
            <img :src="u.url" :alt="u.caption" class="aspect-square w-full bg-slate-50 object-cover" loading="lazy" />
            <div class="p-2">
              <p class="truncate font-medium" :title="u.caption">{{ u.caption }}</p>
              <p class="truncate text-xs text-slate-500" :title="u.name">{{ u.type.replace('image/', '') }} · {{ Math.round(u.size / 1024) }} kB · {{ new Date(u.uploadedAt).toLocaleTimeString() }}</p>
            </div>
          </li>
          <li v-if="uploads.length === 0" class="col-span-full py-2 text-slate-500">Nothing uploaded yet.</li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
