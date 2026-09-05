import { router } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Props {
  contacts: { count: number; resolvedAt: string }
  stats?: { organizations: number; notes: number; resolvedAt: string }
  audit?: { entries: number; resolvedAt: string }
}

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString() : '—')
const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50'

export default function PartialReloads({ contacts, stats, audit }: Props) {
  const [busy, setBusy] = useState(false)
  const reload = (options: Parameters<typeof router.reload>[0]) =>
    router.reload({ ...options, onStart: () => setBusy(true), onFinish: () => setBusy(false) })

  return (
    <AppLayout title="Partial Reloads" description="Ask for some props, and the server resolves only those">
      <section className="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          Every prop is stamped with the time it was resolved. A reload with{' '}
          <code className="rounded bg-slate-100 px-1">only</code> or <code className="rounded bg-slate-100 px-1">except</code>{' '}
          sends <code className="rounded bg-slate-100 px-1">X-Inertia-Partial-Data</code>; the resolver matches paths before
          evaluating anything, so the closures of the other props never run — the 700 ms in{' '}
          <code className="rounded bg-slate-100 px-1">stats</code> is only paid when stats is asked for.{' '}
          <code className="rounded bg-slate-100 px-1">audit</code> is <code className="rounded bg-slate-100 px-1">optional()</code>: absent until a
          reload names it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => reload({})} className={btn}>
            reload() — everything
          </button>
          <button disabled={busy} onClick={() => reload({ only: ['contacts'] })} className={btn}>
            only: ['contacts']
          </button>
          <button disabled={busy} onClick={() => reload({ only: ['stats'] })} className={btn}>
            only: ['stats']
          </button>
          <button disabled={busy} onClick={() => reload({ except: ['stats'] })} className={btn}>
            except: ['stats']
          </button>
          <button disabled={busy} onClick={() => reload({ only: ['audit'] })} className={btn}>
            only: ['audit'] (optional)
          </button>
        </div>
      </section>

      <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
        {[
          { name: 'contacts', value: `${contacts.count} contacts`, at: contacts.resolvedAt, note: 'cheap' },
          { name: 'stats', value: stats ? `${stats.organizations} orgs · ${stats.notes} notes` : '—', at: stats?.resolvedAt, note: '700 ms' },
          { name: 'audit', value: audit ? `${audit.entries} entries` : 'not loaded', at: audit?.resolvedAt, note: 'optional()' },
        ].map((card) => (
          <section key={card.name} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h2 className="font-semibold">{card.name}</h2>
            <p className="text-xs text-slate-500">{card.note}</p>
            <p className="mt-2">{card.value}</p>
            <p className="mt-1 text-xs tabular-nums text-slate-500">resolved {time(card.at)}</p>
          </section>
        ))}
      </div>
    </AppLayout>
  )
}
