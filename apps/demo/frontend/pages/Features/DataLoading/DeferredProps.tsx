import { Deferred, router, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Props {
  contactCount?: number
  noteCount?: number
  slowReport?: { favorites: number; generatedAt: string }
  recommendations?: string[]
}

const Skeleton = ({ lines = 1 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }, (_, i) => (
      <div key={i} className="h-5 animate-pulse rounded bg-slate-100" />
    ))}
  </div>
)

function Card({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <code className="mt-1 block text-xs text-slate-500">{code}</code>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  )
}

export default function DeferredProps({ contactCount, noteCount, slowReport, recommendations }: Props) {
  const rescued = usePage().rescuedProps

  return (
    <AppLayout title="Deferred Props" description="The page paints first; the data follows, in groups, and one prop is allowed to fail">
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Watch the Network tab on a fresh load: the page object arrives with
        <code className="mx-1 rounded bg-slate-100 px-1">deferredProps</code>, then two partial requests follow,
        one per group. The recommendations closure throws on purpose; because it is
        <code className="mx-1 rounded bg-slate-100 px-1">defer(fn, {'{'} rescue: true {'}'})</code>, the counters in
        the same request still arrive and the response lists it under
        <code className="mx-1 rounded bg-slate-100 px-1">rescuedProps</code>. The server logs the error.
      </p>
      <button
        onClick={() => router.visit('/features/data-loading/deferred-props')}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Load again
      </button>

      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <Card title="Counters" code="defer(fn)  ×2, default group">
          <Deferred data={['contactCount', 'noteCount']} fallback={<Skeleton lines={2} />}>
            <p>
              {contactCount} contacts · {noteCount} notes
            </p>
          </Deferred>
        </Card>

        <Card title="Slow report" code="defer(fn, { group: 'report' })">
          <Deferred data="slowReport" fallback={<Skeleton lines={2} />}>
            <p>
              {slowReport?.favorites} favourites · generated {slowReport && new Date(slowReport.generatedAt).toLocaleTimeString()}
            </p>
          </Deferred>
        </Card>

        <Card title="Recommendations (fails)" code="defer(fn, { rescue: true })">
          <Deferred
            data="recommendations"
            fallback={<Skeleton lines={3} />}
            rescue={
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                Recommendations are unavailable right now. Everything else on this page still loaded.
              </p>
            }
          >
            <ul>{recommendations?.map((r) => <li key={r}>{r}</li>)}</ul>
          </Deferred>
        </Card>

        <Card title="What the client knows" code="usePage().rescuedProps">
          <code className="block text-xs">{JSON.stringify(rescued ?? [])}</code>
          <p className="mt-2 text-xs text-slate-500">
            The list survives partial reloads for other props, and is cleared for a prop the moment a reload asks
            for it again.
          </p>
        </Card>
      </div>
    </AppLayout>
  )
}
