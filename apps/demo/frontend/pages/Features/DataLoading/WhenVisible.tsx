import { WhenVisible } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Section {
  name: string
  loadedAt: string
}

const Skeleton = () => (
  <div className="space-y-2">
    <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
  </div>
)

function Block({ name, section, always }: { name: string; section?: Section; always?: boolean }) {
  return (
    <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm" style={{ minHeight: '70vh' }}>
      <h2 className="font-semibold">
        {name} {always && <span className="text-xs font-normal text-slate-500">(always: refetched every time it scrolls into view)</span>}
      </h2>
      <div className="mt-3">
        <WhenVisible data={name} fallback={<Skeleton />} buffer={100} always={always}>
          {({ fetching }) => (
            <p>
              {section ? `Loaded "${section.name}" at ${new Date(section.loadedAt).toLocaleTimeString()}` : 'Waiting…'}
              {fetching && <span className="ml-2 text-blue-600">refreshing…</span>}
            </p>
          )}
        </WhenVisible>
      </div>
    </section>
  )
}

export default function WhenVisiblePage({ recent, reports, archive }: { recent?: Section; reports?: Section; archive?: Section }) {
  return (
    <AppLayout title="When Visible" description="Props that load when their section scrolls into view">
      <section className="mb-4 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          The three sections below are <code className="rounded bg-slate-100 px-1">optional()</code> props: left out of the
          first load. Each is wrapped in <code className="rounded bg-slate-100 px-1">&lt;WhenVisible data="…"&gt;</code>, which
          fires a partial reload for that one prop when it enters the viewport. Scroll, and watch the Network tab:
          one request per section, with <code className="rounded bg-slate-100 px-1">X-Inertia-Partial-Data</code>.
        </p>
      </section>
      <div className="space-y-4">
        <Block name="recent" section={recent} />
        <Block name="reports" section={reports} />
        <Block name="archive" section={archive} always />
      </div>
    </AppLayout>
  )
}
