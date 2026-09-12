import { Link, useForm, usePage } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'
import { DemoLink } from '../../components/DemoLink'

export default function ForgotPassword() {
  const flash = usePage().flash as { message?: string; demoLink?: string } | undefined
  const form = useForm({ email: '' })

  return (
    <AppLayout title="Forgot your password" description="A signed link, good for an hour and for one password">
      {flash?.message && (
        <div role="status" className="mb-4 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {flash.message}
        </div>
      )}
      <DemoLink href={flash?.demoLink} label="Reset link" />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/forgot-password')
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
            className={`mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${form.errors.email ? 'border-red-400' : 'border-slate-300'}`}
          />
          {form.errors.email && <span className="mt-1 block text-xs text-red-600">{form.errors.email}</span>}
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={form.processing}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {form.processing ? 'Sending…' : 'Send reset link'}
          </button>
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to log in
          </Link>
        </div>
      </form>
    </AppLayout>
  )
}
