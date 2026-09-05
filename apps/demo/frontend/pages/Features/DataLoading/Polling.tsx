import { usePoll } from '@inertiajs/react'
import { useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Metrics {
  serverTime: string
  activeUsers: number
  queueDepth: number
  resolvedAt: string
}

export default function Polling({ interval, metrics }: { interval: number; metrics: Metrics }) {
  const [ticks, setTicks] = useState(0)
  const { start, stop, polling } = usePoll(interval, { only: ['metrics'], onSuccess: () => setTicks((t) => t + 1) }, { keepAlive: false })

  return (
    <AppLayout title="Polling" description="Reload some props on an interval, and stop when the tab is hidden">
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            <code className="rounded bg-slate-100 px-1">usePoll({interval}, {'{'} only: ['metrics'] {'}'})</code> issues a partial
            reload every {interval / 1000} s for one prop. Without <code className="rounded bg-slate-100 px-1">keepAlive</code>{' '}
            it pauses while the tab is in the background. The server keeps no state: the numbers derive from the clock.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={start} disabled={polling} className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              Start
            </button>
            <button onClick={stop} disabled={!polling} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50">
              Stop
            </button>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${polling ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
              {polling ? 'polling' : 'stopped'} · {ticks} responses
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <dl className="grid grid-cols-2 gap-y-3">
            <dt className="text-slate-500">Server time</dt>
            <dd className="tabular-nums">{new Date(metrics.serverTime).toLocaleTimeString()}</dd>
            <dt className="text-slate-500">Active users</dt>
            <dd className="text-2xl font-semibold tabular-nums">{metrics.activeUsers}</dd>
            <dt className="text-slate-500">Queue depth</dt>
            <dd className="text-2xl font-semibold tabular-nums">{metrics.queueDepth}</dd>
          </dl>
          <p className="mt-4 text-xs text-slate-500">Only the metrics prop travels on each poll; the page's other props stay as they were.</p>
        </section>
      </div>
    </AppLayout>
  )
}
