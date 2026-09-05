import { Link, progress, router } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50'

export default function Progress({ renderedAt }: { renderedAt: string }) {
  return (
    <AppLayout title="Progress" description="The progress bar at the top, and how to drive it yourself">
      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          The bar is NProgress, started by the client after a visit has been in flight for 250 ms (so quick visits
          never flash it) and finished with the response. Configured once in{' '}
          <code className="rounded bg-slate-100 px-1">createInertiaApp({'{'} progress {'}'})</code> — the generated entry keeps the
          defaults. Rendered at {new Date(renderedAt).toLocaleTimeString()}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/features/events/slow?ms=2000" className={btn}>2 s visit: bar shows</Link>
          <Link href="/features/events/slow?ms=100" className={btn}>100 ms visit: no bar</Link>
          <button onClick={() => router.reload({ only: ['renderedAt'], showProgress: false })} className={btn}>
            reload with showProgress: false
          </button>
        </div>
        <h2 className="mt-5 font-semibold">Manual control</h2>
        <p className="mt-1 text-slate-600">For your own async work, the same bar:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => progress.start()} className={btn}>progress.start()</button>
          <button onClick={() => progress.finish()} className={btn}>progress.finish()</button>
          <button
            onClick={() => {
              progress.start()
              let n = 0
              const id = setInterval(() => {
                n += 0.2
                progress.set(n)
                if (n >= 1) {
                  clearInterval(id)
                  progress.finish()
                }
              }, 400)
            }}
            className={btn}
          >
            fake a 2 s job with progress.set()
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
