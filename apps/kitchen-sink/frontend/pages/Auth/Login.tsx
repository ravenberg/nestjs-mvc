import { Link, useForm, usePage } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'

const input = (invalid: boolean) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

export default function Login() {
  const flash = usePage().flash?.message as string | undefined
  const form = useForm({ email: '', password: '', remember: false })

  return (
    <AppLayout title="Log in" description="The CRM needs a login; every feature page works without one.">
      {flash && <div className="mb-4 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/login', { onFinish: () => form.reset('password') })
        }}
        className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm"
      >
        <label className="block">
          <span className="font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="username"
            value={form.data.email}
            onChange={(e) => form.setData('email', e.target.value)}
            className={input(!!form.errors.email)}
          />
          {form.errors.email && <span className="mt-1 block text-xs text-red-600">{form.errors.email}</span>}
        </label>

        <label className="mt-3 block">
          <span className="font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
            className={input(!!form.errors.password)}
          />
          {form.errors.password && <span className="mt-1 block text-xs text-red-600">{form.errors.password}</span>}
        </label>

        <label className="mt-3 flex items-center gap-2 text-slate-700">
          <input type="checkbox" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} />
          Remember me
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={form.processing}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {form.processing ? 'Logging in…' : 'Log in'}
          </button>
          <Link href="/register" className="text-blue-600 hover:underline">
            Register instead
          </Link>
          <Link href="/forgot-password" className="text-slate-600 hover:underline">
            Forgot your password?
          </Link>
        </div>

        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Seeded users: <code>test@example.com</code>, <code>user1@example.com</code> … <code>user3@example.com</code>,
          all with the password <code>password</code>.
        </p>
      </form>
    </AppLayout>
  )
}
