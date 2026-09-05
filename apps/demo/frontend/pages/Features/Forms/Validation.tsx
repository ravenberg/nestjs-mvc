import { useForm } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function Validation({ messages }: { messages: string[] }) {
  const { data, setData, post, processing, reset, errors } = useForm({ message: '' })

  return (
    <AppLayout
      title="Validation"
      description="Server-side validation errors delivered through the redirect-back flow"
    >
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Submitting fewer than 3 characters throws a{' '}
          <code className="rounded bg-slate-100 px-1">ValidationException</code> on the server. The
          adapter flashes the errors, redirects back, and exposes them as the{' '}
          <code className="rounded bg-slate-100 px-1">errors</code> prop — no session middleware
          required.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            post('/features/forms/validation', { onSuccess: () => reset() })
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={data.message}
            onChange={(e) => setData('message', e.target.value)}
            placeholder="Type something…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={processing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {errors.message && <p className="mt-2 text-sm text-red-600">{errors.message}</p>}

        <ul className="mt-6 divide-y divide-slate-100">
          {messages.map((message, i) => (
            <li key={i} className="py-2 text-sm">
              {message}
            </li>
          ))}
          {messages.length === 0 && <li className="py-2 text-sm text-slate-500">No messages yet.</li>}
        </ul>
      </section>
    </AppLayout>
  )
}
