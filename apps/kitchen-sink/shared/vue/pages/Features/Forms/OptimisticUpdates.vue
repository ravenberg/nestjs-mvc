<script setup lang="ts">
import { router, useForm } from 'nestjs-mvc/vue'
import AppLayout from '../../../layouts/AppLayout.vue'

interface Todo {
  id: number
  title: string
  done: boolean
  /** Only present on the optimistic copy, never sent by the server. */
  pending?: boolean
}

defineProps<{ todos: Todo[] }>()

const form = useForm({ title: '' })

function add() {
  form
    .optimistic<{ todos: Todo[] }>((props) => ({
      todos: [...props.todos, { id: -Date.now(), title: form.title, done: false, pending: true }],
    }))
    .post('/features/forms/optimistic-updates/todos', { onSuccess: () => form.reset() })
}

function toggle(todo: Todo) {
  router.patch(
    `/features/forms/optimistic-updates/todos/${todo.id}`,
    {},
    {
      optimistic: (props) => ({
        todos: (props.todos as Todo[]).map((t) => (t.id === todo.id ? { ...t, done: !t.done, pending: true } : t)),
      }),
    },
  )
}
</script>

<template>
  <AppLayout title="Optimistic Updates" description="Show the result before the server confirms it; roll back if it does not">
    <div class="grid max-w-5xl gap-4 md:grid-cols-2">
      <form class="rounded-xl border border-slate-200 bg-white p-6 text-sm" @submit.prevent="add">
        <p class="text-slate-600">
          The server sleeps 1.2 s on every write. With <code class="rounded bg-slate-100 px-1">optimistic()</code> the new todo appears at once (faded), and the real one replaces it when the redirect back lands. Type <code class="rounded bg-slate-100 px-1">fail</code>: the server rejects it, the optimistic copy is rolled back, and the error shows. Nothing about this is server-side — the handler is a normal POST with a schema and <code class="rounded bg-slate-100 px-1">back()</code>.
        </p>
        <div class="mt-4 flex gap-2">
          <input
            v-model="form.title"
            placeholder="New todo…"
            :class="['flex-1 rounded-lg border px-3 py-2 outline-none focus:border-blue-500', form.errors.title ? 'border-red-400' : 'border-slate-300']"
          />
          <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Add</button>
        </div>
        <p v-if="form.errors.title" class="mt-1 text-xs text-red-600">{{ form.errors.title }}</p>
      </form>

      <section class="rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 class="font-semibold">Todos</h2>
        <ul class="mt-2 divide-y divide-slate-100">
          <li v-for="todo in todos" :key="todo.id" :class="['flex items-center gap-3 py-2', todo.pending ? 'opacity-50' : '']">
            <input type="checkbox" :checked="todo.done" @change="toggle(todo)" />
            <span :class="todo.done ? 'text-slate-400 line-through' : ''">{{ todo.title }}</span>
            <span v-if="todo.pending" class="ml-auto text-xs text-slate-400">saving…</span>
          </li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>
