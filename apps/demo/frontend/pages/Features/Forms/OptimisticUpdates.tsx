import { router, useForm } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Todo {
  id: number
  title: string
  done: boolean
  /** Only present on the optimistic copy, never sent by the server. */
  pending?: boolean
}

export default function OptimisticUpdates({ todos }: { todos: Todo[] }) {
  const form = useForm({ title: '' })

  const add = () =>
    form
      .optimistic<{ todos: Todo[] }>((props) => ({
        todos: [...props.todos, { id: -Date.now(), title: form.data.title, done: false, pending: true }],
      }))
      .post('/features/forms/optimistic-updates/todos', { onSuccess: () => form.reset() })

  const toggle = (todo: Todo) =>
    router.patch(
      `/features/forms/optimistic-updates/todos/${todo.id}`,
      {},
      {
        optimistic: (props) => ({
          todos: (props.todos as Todo[]).map((t) => (t.id === todo.id ? { ...t, done: !t.done, pending: true } : t)),
        }),
      },
    )

  return (
    <AppLayout title="Optimistic Updates" description="Show the result before the server confirms it; roll back if it does not">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <p className="text-slate-600">
            The server sleeps 1.2 s on every write. With <code className="rounded bg-slate-100 px-1">optimistic()</code>{' '}
            the new todo appears at once (faded), and the real one replaces it when the redirect back lands. Type{' '}
            <code className="rounded bg-slate-100 px-1">fail</code>: the server rejects it, the optimistic copy is
            rolled back, and the error shows. Nothing about this is server-side — the handler is a normal POST with a
            schema and <code className="rounded bg-slate-100 px-1">back()</code>.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={form.data.title}
              onChange={(e) => form.setData('title', e.target.value)}
              placeholder="New todo…"
              className={`flex-1 rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${form.errors.title ? 'border-red-400' : 'border-slate-300'}`}
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
              Add
            </button>
          </div>
          {form.errors.title && <p className="mt-1 text-xs text-red-600">{form.errors.title}</p>}
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Todos</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {todos.map((todo) => (
              <li key={todo.id} className={`flex items-center gap-3 py-2 ${todo.pending ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
                <span className={todo.done ? 'text-slate-400 line-through' : ''}>{todo.title}</span>
                {todo.pending && <span className="ml-auto text-xs text-slate-400">saving…</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
