import { Link, router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Toast {
  level: string
  title: string
  body: string
}

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function Flash() {
  const page = usePage()
  const flash = page.flash ?? {}
  const message = flash.message as string | undefined
  const toast = flash.toast as Toast | undefined
  const status = flash.status as string | undefined
  const [log, setLog] = useState<string[]>([])

  // The `flash` event fires whenever a response carries flash data — a good
  // place for a toast system that lives outside any page component.
  useEffect(
    () =>
      router.on('flash', (event) => {
        setLog((l) => [`${new Date().toLocaleTimeString()} flash event: ${Object.keys(event.detail.flash).join(', ')}`, ...l].slice(0, 8))
      }),
    [],
  )

  return (
    <AppLayout title="Flash Data" description="One-shot data from the server: on the next render, then gone">
      {message && <div className="mb-3 max-w-3xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
      {toast && (
        <div className={`mb-3 max-w-3xl rounded-xl border px-4 py-3 text-sm ${toast.level === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
          <strong>{toast.title}</strong> — {toast.body} {status && <span className="ml-2 rounded-full bg-white/60 px-2 text-xs">status: {status}</span>}
        </div>
      )}

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            <code className="rounded bg-slate-100 px-1">view.flash(key, value)</code> in a handler; the page object carries{' '}
            <code className="rounded bg-slate-100 px-1">flash</code> on the next render and the client clears it from history,
            so Back never replays it. It travels in the same client-held bag as validation errors: no session.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => router.post('/features/state/flash/message')} className={btn}>POST → flash a message</button>
            <button onClick={() => router.post('/features/state/flash/structured', { level: 'info' })} className={btn}>POST → structured</button>
            <button onClick={() => router.post('/features/state/flash/structured', { level: 'error' })} className={`${btn} text-red-700`}>POST → structured (error)</button>
            <Link href="/features/state/flash/render" className={btn}>GET that flashes on its own render</Link>
            <button onClick={() => router.flash('message', 'Set on the client with router.flash(); same page.flash, no request.')} className={btn}>
              router.flash() client-side
            </button>
            <Link href="/features/state/flash" className={btn}>Plain visit (nothing flashed)</Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Current page.flash</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(flash, null, 2)}</pre>
          <h2 className="mt-4 font-semibold">router.on('flash') log</h2>
          <ul className="mt-1 text-xs tabular-nums text-slate-600">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
            {log.length === 0 && <li className="text-slate-400">no events yet</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
