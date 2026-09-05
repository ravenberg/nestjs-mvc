import { router } from '@inertiajs/react'
import { useRef, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50'

export default function VisitCallbacks({ renderedAt }: { renderedAt: string }) {
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const cancel = useRef<{ cancel: () => void } | null>(null)
  const push = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 12))

  const visit = (url: string, extra: Record<string, unknown> = {}) =>
    router.visit(url, {
      ...extra,
      onBefore: (v) => {
        push(`onBefore ${v.url.pathname}${v.url.search}`)
        return true
      },
      onCancelToken: (token) => {
        cancel.current = token
      },
      onStart: () => {
        setBusy(true)
        push('onStart')
      },
      onProgress: (p) => p && push(`onProgress ${p.percentage ?? '?'}%`),
      onSuccess: (page) => push(`onSuccess → ${page.component}`),
      onError: (errors) => push(`onError ${JSON.stringify(errors)}`),
      onHttpException: (response) => {
        push(`onHttpException ${response.status}`)
        return false // handled here: no error dialog
      },
      onCancel: () => push('onCancel'),
      onFinish: () => {
        setBusy(false)
        push('onFinish')
      },
    })

  return (
    <AppLayout title="Visit Callbacks" description="Per-visit lifecycle hooks, next to the global events">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            Every <code className="rounded bg-slate-100 px-1">router.visit()</code>, form submit and{' '}
            <code className="rounded bg-slate-100 px-1">&lt;Link&gt;</code> accepts callbacks for its own lifecycle. The
            same names as the global events, scoped to one visit. Because this demo configures{' '}
            <code className="rounded bg-slate-100 px-1">errorPages</code>, a 404 or 500 arrives as a page (onSuccess);{' '}
            <code className="rounded bg-slate-100 px-1">onHttpException</code> fires for statuses without one, or when
            you leave the option out. Rendered at {new Date(renderedAt).toLocaleTimeString()}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => visit('/features/events/callbacks', { only: ['renderedAt'] })} className={btn}>
              partial reload of this page
            </button>
            <button disabled={busy} onClick={() => visit('/features/events/slow?ms=1500')} className={btn}>
              slow visit (1.5 s)
            </button>
            <button disabled={busy} onClick={() => visit('/features/events/slow?ms=300&fail=1')} className={btn}>
              visit that throws (500 → errorPages, so still onSuccess)
            </button>
            <button disabled={busy} onClick={() => visit('/features/errors/http/404')} className={btn}>
              404 (same: the error page is a page)
            </button>
            <button disabled={busy} onClick={() => { visit('/features/events/slow?ms=3000'); setTimeout(() => cancel.current?.cancel(), 500) }} className={btn}>
              start, then cancel it via the cancel token
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Callback log</h2>
          <ul className="mt-2 font-mono text-xs text-slate-600">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
            {log.length === 0 && <li className="font-sans text-slate-400">click something</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
