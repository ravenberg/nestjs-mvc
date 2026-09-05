import { Link, useRemember } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function Remember({ renderedAt }: { renderedAt: string }) {
  const [remembered, setRemembered] = useRemember({ query: '', sort: 'name', open: true }, 'filters')
  const [forgotten, setForgotten] = useState({ query: '' })

  const input = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500'

  return (
    <AppLayout title="Remember" description="Component state that survives a visit away and the Back button">
      <section className="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          Inertia keeps page props in <code className="rounded bg-slate-100 px-1">history.state</code>, not your component's
          local state. <code className="rounded bg-slate-100 px-1">useRemember(initial, key)</code> stores that state in the
          history entry too, so it comes back with Back — the way a browser restores a form on a normal page. Fill in the
          left form, <Link href="/dashboard" className="text-blue-700 underline">visit the Dashboard</Link>, press Back.
        </p>
        <p className="mt-2 text-xs text-slate-500">Rendered at {new Date(renderedAt).toLocaleTimeString()}. Nothing is sent to the server.</p>
      </section>

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-green-200 bg-white p-5 text-sm">
          <h2 className="font-semibold">useRemember</h2>
          <label className="mt-3 block">
            <span className="text-slate-700">Search</span>
            <input value={remembered.query} onChange={(e) => setRemembered({ ...remembered, query: e.target.value })} className={input} />
          </label>
          <label className="mt-3 block">
            <span className="text-slate-700">Sort</span>
            <select value={remembered.sort} onChange={(e) => setRemembered({ ...remembered, sort: e.target.value })} className={input}>
              <option value="name">name</option>
              <option value="date">date</option>
              <option value="size">size</option>
            </select>
          </label>
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={remembered.open} onChange={(e) => setRemembered({ ...remembered, open: e.target.checked })} />
            Panel open
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold">useState (for contrast)</h2>
          <label className="mt-3 block">
            <span className="text-slate-700">Search</span>
            <input value={forgotten.query} onChange={(e) => setForgotten({ query: e.target.value })} className={input} />
          </label>
          <p className="mt-3 text-xs text-slate-500">Gone after Back: the component remounts with its initial state.</p>
        </section>
      </div>
    </AppLayout>
  )
}
