import { Link, useForm } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'

const input = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

type Field = 'name' | 'email' | 'password' | 'password_confirmation'

const fields: { name: Field; label: string; type: string; autoComplete: string }[] = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'username' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  { name: 'password_confirmation', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
]

export default function Register() {
  const form = useForm({ name: '', email: '', password: '', password_confirmation: '' })

  return (
    <AppLayout title="Register" description="An account of your own in the demo CRM.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/register', { onFinish: () => form.reset('password', 'password_confirmation') })
        }}
        className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm"
      >
        {fields.map((field, index) => (
          <label key={field.name} className={`block ${index > 0 ? 'mt-3' : ''}`}>
            <span className="font-medium text-slate-700">{field.label}</span>
            <input
              type={field.type}
              autoComplete={field.autoComplete}
              value={form.data[field.name]}
              onChange={(e) => form.setData(field.name, e.target.value)}
              className={input(!!form.errors[field.name])}
            />
            {form.errors[field.name] && <span className="mt-1 block text-xs text-red-600">{form.errors[field.name]}</span>}
          </label>
        ))}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={form.processing}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {form.processing ? 'Creating…' : 'Create account'}
          </button>
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in instead
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}
