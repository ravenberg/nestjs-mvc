import { router } from '@inertiajs/react'
import { useRef, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50'

export default function Network({ renderedAt }: { renderedAt: string }) {
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const cancel = useRef<{ cancel: () => void } | null>(null)
  const push = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 10))

  const attempt = (url: string, label: string) =>
    router.visit(url, {
      onCancelToken: (token) => {
        cancel.current = token
      },
      onStart: () => {
        setBusy(true)
        push(`${label}: started`)
      },
      onSuccess: () => push(`${label}: success`),
      onHttpException: (r) => {
        push(`${label}: onHttpException ${r.status}`)
        return false
      },
      onNetworkError: (error) => {
        push(`${label}: onNetworkError — ${error.message}`)
        return false // handled: no dialog
      },
      onFinish: () => setBusy(false),
    })

  return (
    <AppLayout title="Network Errors" description="When the server is unreachable, or never answers">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            An HTTP error still has a response; a network error has none. Inertia reports the second kind through{' '}
            <code className="rounded bg-slate-100 px-1">onNetworkError</code> and the global{' '}
            <code className="rounded bg-slate-100 px-1">exception</code> event. Return{' '}
            <code className="rounded bg-slate-100 px-1">false</code> to handle it yourself instead of the dialog. Rendered at{' '}
            {new Date(renderedAt).toLocaleTimeString()}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => attempt('http://localhost:1/nothing', 'unreachable port')} className={btn}>
              visit an unreachable host
            </button>
            <button
              disabled={busy}
              onClick={() => {
                attempt('/features/errors/network/hang', 'hanging request')
                setTimeout(() => {
                  cancel.current?.cancel()
                  push('hanging request: cancelled after 3 s (cancel token)')
                }, 3000)
              }}
              className={btn}
            >
              visit a route that never answers, cancel after 3 s
            </button>
            <button disabled={busy} onClick={() => attempt('/features/errors/http/503', '503')} className={btn}>
              503 for contrast (answered by errorPages: a page, so success)
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Real-world equivalents: airplane mode, a deploy restarting the server, a proxy timing out. The page
            you were on stays intact either way.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Log</h2>
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
