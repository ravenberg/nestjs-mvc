import { useForm, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Registration {
  id: number
  name: string
  email: string
  registeredAt: string
}

function Field({
  label,
  type = 'text',
  value,
  error,
  valid,
  validating,
  onChange,
  onBlur,
}: {
  label: string
  type?: string
  value: string
  error?: string
  valid: boolean
  validating: boolean
  onChange: (v: string) => void
  onBlur: () => void
}) {
  return (
    <label className="mt-3 block">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="relative mt-1 block">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`block w-full rounded-lg border px-3 py-2 pr-8 outline-none focus:border-blue-500 ${
            error ? 'border-red-400' : valid ? 'border-green-400' : 'border-slate-300'
          }`}
        />
        <span className="absolute top-2 right-3 text-xs">{validating ? '…' : valid && !error ? <span className="text-green-600">✓</span> : null}</span>
      </span>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default function Precognition({ registrations }: { registrations: Registration[] }) {
  const flash = usePage().flash?.message as string | undefined
  // (method, url, data) turns on precognition: validate() posts to the same
  // endpoint with `Precognition: true`; the handler never runs.
  const form = useForm('post', '/features/forms/precognition/register', { name: '', email: '', password: '' })
  const field = (name: 'name' | 'email' | 'password') => ({
    value: form.data[name],
    error: form.errors[name],
    valid: form.valid(name),
    validating: form.validating && form.touched(name),
    onChange: (v: string) => form.setData(name, v),
    onBlur: () => form.validate(name),
  })

  return (
    <AppLayout title="Precognition" description="Validate a field the moment the user leaves it, against the real endpoint and its real rules">
      {flash && <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}

      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.submit({ onSuccess: () => form.reset() })
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <p className="text-slate-600">
            Try <code className="rounded bg-slate-100 px-1">ada@example.com</code>: the email is taken, and the server
            says so before you submit. That rule needs the database, so it lives in the Zod schema as an async{' '}
            <code className="rounded bg-slate-100 px-1">refine</code> — precognition runs the schema without running the
            handler. One set of rules, no validation endpoint.
          </p>

          <Field label="Name" {...field('name')} />
          <Field label="Email" type="email" {...field('email')} />
          <Field label="Password" type="password" {...field('password')} />

          <button
            type="submit"
            disabled={form.processing || form.validating}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Register
          </button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Registered</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {registrations.map((r) => (
              <li key={r.id} className="py-2">
                {r.name} <span className="text-slate-500">· {r.email}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Network tab: each blur is a POST to the register endpoint with{' '}
            <code className="rounded bg-slate-100 px-1">Precognition: true</code> and{' '}
            <code className="rounded bg-slate-100 px-1">Precognition-Validate-Only</code>, answered 204 or 422.
          </p>
        </section>
      </div>
    </AppLayout>
  )
}
