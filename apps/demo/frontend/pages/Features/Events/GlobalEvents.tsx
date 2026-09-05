import { Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

const EVENTS = ['before', 'start', 'progress', 'success', 'error', 'exception', 'invalid', 'finish', 'navigate', 'prefetching', 'prefetched', 'flash'] as const
const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function GlobalEvents({ renderedAt }: { renderedAt: string }) {
  const [log, setLog] = useState<string[]>([])
  const [blockExternal, setBlockExternal] = useState(false)

  useEffect(() => {
    const push = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 14))
    const offs = EVENTS.map((name) =>
      router.on(name as never, ((event: CustomEvent<Record<string, unknown>>) => {
        const d = event.detail ?? {}
        const visit = d.visit as { url?: URL; method?: string } | undefined
        const extra = visit?.url ? `${visit.method?.toUpperCase()} ${visit.url.pathname}${visit.url.search}` : d.page ? `page ${(d.page as { component: string }).component}` : ''
        push(`${name.padEnd(11)} ${extra}`)
        // `before` may cancel a visit by returning false.
        if (name === 'before' && blockExternal && visit?.url?.pathname.includes('/slow')) {
          push('before      → cancelled (returned false)')
          return false
        }
      }) as never),
    )
    return () => offs.forEach((off) => off())
  }, [blockExternal])

  return (
    <AppLayout title="Global Events" description="router.on(...) for every step of a visit; return false from `before` to cancel">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <p className="text-slate-600">
            Listeners registered with <code className="rounded bg-slate-100 px-1">router.on(name, fn)</code> (they return an
            unsubscribe function) or as <code className="rounded bg-slate-100 px-1">inertia:name</code> DOM events. This
            page logs them all. Rendered at {new Date(renderedAt).toLocaleTimeString()}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/features/events/slow?ms=1200" className={btn}>visit a slow page (1.2 s)</Link>
            <Link href="/features/events/slow?ms=300&fail=1" className={btn}>visit a page that throws</Link>
            <button onClick={() => router.reload({ only: ['renderedAt'] })} className={btn}>reload()</button>
            <Link href="/features/events/callbacks" prefetch="click" className={btn}>prefetch on mousedown</Link>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={blockExternal} onChange={(e) => setBlockExternal(e.target.checked)} />
            cancel visits to /slow from the <code className="rounded bg-slate-100 px-1">before</code> listener
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Event log</h2>
          <ul className="mt-2 font-mono text-xs text-slate-600">
            {log.map((l, i) => (
              <li key={i} className="whitespace-pre">{l}</li>
            ))}
            {log.length === 0 && <li className="font-sans text-slate-400">click something</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  )
}
