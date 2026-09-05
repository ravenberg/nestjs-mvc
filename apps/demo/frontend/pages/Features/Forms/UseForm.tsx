import { useForm, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Message {
  id: number
  author: string
  body: string
  sentAt: string
}

const Flag = ({ on, label }: { on: boolean; label: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
    {label}: {String(on)}
  </span>
)

export default function UseForm({ messages }: { messages: Message[] }) {
  const flash = usePage().flash?.message as string | undefined
  const form = useForm({ author: '', body: '' })

  // Runs on submit, on the data about to be sent, without touching the inputs.
  form.transform((data) => ({ ...data, body: data.body.trim() }))

  return (
    <AppLayout title="useForm" description="The form helper: data, errors, processing, transform, reset — and the two server paths">
      {flash && <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}

      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.post('/features/forms/use-form/messages', { onSuccess: () => form.reset() })
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <p className="text-slate-600">
            <code className="rounded bg-slate-100 px-1">useForm()</code> keeps the data, sends it, and receives the{' '}
            <code className="rounded bg-slate-100 px-1">errors</code> prop after the redirect back. The server side is a
            handler with a Zod schema; it never learns which helper submitted.
          </p>

          <label className="mt-4 block">
            <span className="font-medium text-slate-700">Name</span>
            <input
              value={form.data.author}
              onChange={(e) => form.setData('author', e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${form.errors.author ? 'border-red-400' : 'border-slate-300'}`}
            />
            {form.errors.author && <span className="mt-1 block text-xs text-red-600">{form.errors.author}</span>}
          </label>

          <label className="mt-3 block">
            <span className="font-medium text-slate-700">Message</span>
            <textarea
              value={form.data.body}
              onChange={(e) => form.setData('body', e.target.value)}
              rows={3}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${form.errors.body ? 'border-red-400' : 'border-slate-300'}`}
            />
            {form.errors.body && <span className="mt-1 block text-xs text-red-600">{form.errors.body}</span>}
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={form.processing}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {form.processing ? 'Sending…' : 'Send'}
            </button>
            <button type="button" onClick={() => form.reset()} className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50">
              Reset
            </button>
            <button type="button" onClick={() => form.clearErrors()} className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50">
              Clear errors
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1">
            <Flag on={form.isDirty} label="isDirty" />
            <Flag on={form.processing} label="processing" />
            <Flag on={form.hasErrors} label="hasErrors" />
            <Flag on={form.wasSuccessful} label="wasSuccessful" />
            <Flag on={form.recentlySuccessful} label="recentlySuccessful" />
          </div>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Messages</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {messages.map((m) => (
              <li key={m.id} className="py-2">
                <p>{m.body}</p>
                <p className="text-xs text-slate-500">
                  {m.author} · {new Date(m.sentAt).toLocaleTimeString()}
                </p>
              </li>
            ))}
            {messages.length === 0 && <li className="py-2 text-slate-500">Nothing yet. Submit the form empty first to see the errors.</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
