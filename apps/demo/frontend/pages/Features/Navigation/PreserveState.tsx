import { Link } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

const TABS = ['profile', 'billing', 'team']

export default function PreserveState({ tab, renderedAt }: { tab: string; renderedAt: string }) {
  const [draft, setDraft] = useState('')
  const [mounted] = useState(() => new Date().toLocaleTimeString())

  const tabs = (preserveState: boolean) =>
    TABS.map((t) => (
      <Link
        key={t}
        href={`/features/navigation/preserve-state?tab=${t}`}
        preserveState={preserveState}
        className={`rounded-lg border px-3 py-1.5 text-sm ${tab === t ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-300 hover:bg-slate-50'}`}
      >
        {t}
      </Link>
    ))

  return (
    <AppLayout title="Preserve State" description="Whether a visit to the same component keeps the component instance, or remounts it">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            Type something below, then switch tabs. The props change either way (server-rendered at{' '}
            <span className="tabular-nums">{new Date(renderedAt).toLocaleTimeString()}</span>); what differs is whether
            React keeps this component instance — and with it your draft and the mount time.
          </p>
          <label className="mt-4 block">
            <span className="font-medium text-slate-700">Local draft (component state, never sent)</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type, then switch tabs…"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Component mounted at {mounted}</p>
        </section>

        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <div>
            <h2 className="font-semibold">preserveState</h2>
            <p className="mt-1 text-slate-600">Same instance: the draft and mount time survive; only the props update.</p>
            <div className="mt-2 flex gap-2">{tabs(true)}</div>
          </div>
          <div>
            <h2 className="font-semibold">default</h2>
            <p className="mt-1 text-slate-600">Remounted: the draft is gone and the mount time changes.</p>
            <div className="mt-2 flex gap-2">{tabs(false)}</div>
          </div>
          <p className="text-xs text-slate-500">
            Current tab: <strong>{tab}</strong>. Forms with <code className="rounded bg-slate-100 px-1">useForm</code> and
            filters use <code className="rounded bg-slate-100 px-1">preserveState</code> for exactly this reason; the
            Contacts page does.
          </p>
        </section>
      </div>
    </AppLayout>
  )
}
