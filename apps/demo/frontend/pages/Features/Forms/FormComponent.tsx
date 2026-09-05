import { Form, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Subscriber {
  id: number
  name: string
  email: string
  plan: string
  subscribedAt: string
}

const input = (error?: string) =>
  `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-300'}`

export default function FormComponent({ subscribers }: { subscribers: Subscriber[] }) {
  const flash = usePage().flash?.message as string | undefined

  return (
    <AppLayout title="Form Component" description="No state on the client: the <Form> reads the DOM, submits, and hands you errors and status">
      {flash && <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{flash}</div>}

      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <Form
          action="/features/forms/form-component/subscribe"
          method="post"
          resetOnSuccess
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          {({ errors, processing, wasSuccessful, isDirty }) => (
            <>
              <p className="text-slate-600">
                Plain inputs with <code className="rounded bg-slate-100 px-1">name</code> attributes; the{' '}
                <code className="rounded bg-slate-100 px-1">&lt;Form&gt;</code> serialises them, posts as an Inertia visit and
                exposes the result as render props. Same handler shape as everywhere: a Zod schema and{' '}
                <code className="rounded bg-slate-100 px-1">back()</code>.
              </p>

              <label className="mt-4 block">
                <span className="font-medium text-slate-700">Name</span>
                <input name="name" className={input(errors.name)} />
                {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
              </label>

              <label className="mt-3 block">
                <span className="font-medium text-slate-700">Email</span>
                <input name="email" type="email" className={input(errors.email)} />
                {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
              </label>

              <fieldset className="mt-3">
                <legend className="font-medium text-slate-700">Plan</legend>
                <div className="mt-1 flex gap-4">
                  {['free', 'team', 'enterprise'].map((plan) => (
                    <label key={plan} className="flex items-center gap-1">
                      <input type="radio" name="plan" value={plan} /> {plan}
                    </label>
                  ))}
                </div>
                {errors.plan && <span className="mt-1 block text-xs text-red-600">{errors.plan}</span>}
              </fieldset>

              <label className="mt-3 flex items-center gap-2">
                <input type="checkbox" name="terms" value="true" /> I accept the terms
              </label>
              {errors.terms && <span className="mt-1 block text-xs text-red-600">{errors.terms}</span>}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Subscribing…' : 'Subscribe'}
                </button>
                <span className="text-xs text-slate-500">
                  isDirty {String(isDirty)} · wasSuccessful {String(wasSuccessful)}
                </span>
              </div>
            </>
          )}
        </Form>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Subscribers</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {subscribers.map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span>
                  {s.name} <span className="text-slate-500">· {s.email}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 text-xs">{s.plan}</span>
              </li>
            ))}
            {subscribers.length === 0 && <li className="py-2 text-slate-500">No one yet.</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
