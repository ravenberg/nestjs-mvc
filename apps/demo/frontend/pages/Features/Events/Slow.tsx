import { Link } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function Slow({ renderedAt, waited }: { renderedAt: string; waited: number }) {
  return (
    <AppLayout title="Slow page" description="A visit target that takes its time">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p>
          The server waited {waited} ms and rendered at {new Date(renderedAt).toLocaleTimeString()}.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/features/events/global" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Global Events</Link>
          <Link href="/features/events/callbacks" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Visit Callbacks</Link>
          <Link href="/features/events/progress" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">Progress</Link>
        </div>
      </section>
    </AppLayout>
  )
}
