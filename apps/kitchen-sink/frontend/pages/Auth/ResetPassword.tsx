import { useForm } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'

interface Props {
  email: string
  /** The signed URL this page was opened with; the form posts back to it. */
  action: string
}

export default function ResetPassword({ email, action }: Props) {
  const form = useForm({ password: '', password_confirmation: '' })
  const input = (invalid: boolean) =>
    `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${invalid ? 'border-red-400' : 'border-slate-300'}`

  return (
    <AppLayout title="Choose a new password" description={email}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post(action)
        }}
        className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-sm"
      >
        <label className="block">
          <span className="font-medium text-slate-700">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
            className={input(!!form.errors.password)}
          />
          {form.errors.password && <span className="mt-1 block text-xs text-red-600">{form.errors.password}</span>}
        </label>

        <label className="mt-3 block">
          <span className="font-medium text-slate-700">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.data.password_confirmation}
            onChange={(e) => form.setData('password_confirmation', e.target.value)}
            className={input(!!form.errors.password_confirmation)}
          />
          {form.errors.password_confirmation && (
            <span className="mt-1 block text-xs text-red-600">{form.errors.password_confirmation}</span>
          )}
        </label>

        <button
          type="submit"
          disabled={form.processing}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {form.processing ? 'Saving…' : 'Save password'}
        </button>

        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          The link that brought you here is signed and bound to your current password, so it stops working the moment
          this form succeeds.
        </p>
      </form>
    </AppLayout>
  )
}
