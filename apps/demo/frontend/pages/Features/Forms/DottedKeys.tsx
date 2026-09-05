import { useForm, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Submission {
  user: { name: string; email: string }
  address: { city: string; postcode: string }
  tags: string[]
}

type FormData = { user: { name: string; email: string }; address: { city: string; postcode: string }; tags: string[] }

function Field({
  label,
  value,
  error,
  valid,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string
  value: string
  error?: string
  valid?: boolean
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
}) {
  const border = error ? 'border-red-400' : valid ? 'border-green-400' : 'border-slate-300'
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="relative mt-1 block">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`block w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 ${border}`}
        />
        {valid && !error && <span className="absolute top-2 right-3 text-green-600">✓</span>}
      </span>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export default function DottedKeys({ submissions }: { submissions: Submission[] }) {
  const message = usePage().flash?.message as string | undefined
  // The (method, url, data) signature turns on Precognition: `validate()` posts
  // to the same endpoint with `Precognition: true`, and the server answers with
  // the same schema's verdict without running the handler.
  const form = useForm<FormData>('post', '/features/forms/dotted-keys', {
    user: { name: '', email: '' },
    address: { city: '', postcode: '' },
    tags: ['', ''],
  })
  // Errors arrive keyed by dot path, exactly as Standard Schema reports them.
  const errors = form.errors as Record<string, string | undefined>
  const field = (name: string) => ({
    error: errors[name],
    valid: form.valid(name as never),
    onBlur: () => form.validate(name as never),
  })

  return (
    <AppLayout title="Dotted Keys" description="Nested form data validated by a Zod schema, live and on submit">
      {message && (
        <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.submit({ onSuccess: () => form.reset() })
        }}
        className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-sm text-slate-600">
          The handler is <code className="rounded bg-slate-100 px-1">@Body({'{'} schema {'}'})</code> with a Zod
          schema, validated by NestJS v12&apos;s <code className="rounded bg-slate-100 px-1">StandardSchemaValidationPipe</code>.
          Leave a field to validate it live (<strong>Precognition</strong>: the same endpoint, the same schema,
          a <code className="rounded bg-slate-100 px-1">Precognition: true</code> header, and the handler never runs),
          or submit it empty to see every error at once.
          {form.validating && <span className="ml-2 text-blue-600">Validating…</span>}
        </p>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">user.*</legend>
          <Field label="Name" value={form.data.user.name} {...field('user.name')} onChange={(v) => form.setData('user', { ...form.data.user, name: v })} />
          <Field label="Email" value={form.data.user.email} {...field('user.email')} onChange={(v) => form.setData('user', { ...form.data.user, email: v })} />
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">address.*</legend>
          <Field label="City" value={form.data.address.city} {...field('address.city')} onChange={(v) => form.setData('address', { ...form.data.address, city: v })} />
          <Field label="Postcode" value={form.data.address.postcode} {...field('address.postcode')} placeholder="1234 AB" onChange={(v) => form.setData('address', { ...form.data.address, postcode: v })} />
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">tags.N</legend>
          {form.data.tags.map((tag, i) => (
            <Field
              key={i}
              label={`Tag ${i + 1}`}
              value={tag}
              {...field(`tags.${i}`)}
              onChange={(v) => form.setData('tags', form.data.tags.map((t, j) => (j === i ? v : t)))}
            />
          ))}
          {errors.tags && <p className="text-xs text-red-600 md:col-span-2">{errors.tags}</p>}
        </fieldset>

        <button
          type="submit"
          disabled={form.processing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save contact
        </button>
      </form>

      <section className="mt-6 max-w-2xl">
        <h2 className="text-sm font-semibold text-slate-500">Accepted submissions</h2>
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {submissions.map((s, i) => (
            <li key={i} className="px-4 py-2 text-sm">
              <span className="font-medium">{s.user.name}</span> · {s.user.email} · {s.address.postcode} {s.address.city}
              {s.tags.filter(Boolean).length > 0 && <span className="text-slate-500"> · {s.tags.filter(Boolean).join(', ')}</span>}
            </li>
          ))}
          {submissions.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nothing accepted yet.</li>}
        </ul>
      </section>
    </AppLayout>
  )
}
