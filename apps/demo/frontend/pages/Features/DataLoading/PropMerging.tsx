import { router } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

interface Item {
  id: number
  label: string
  stamp: string
  count?: number
}

interface Props {
  tick: number
  appended: Item[]
  prepended: Item[]
  matched: Item[]
  deep: { counts: Record<string, number>; items: { id: number; seen: number; stamp: string }[] }
}

const ALL = ['appended', 'prepended', 'matched', 'deep']

function Card({ title, code, children }: { title: string; code: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <code className="mt-1 block text-xs text-slate-500">{code}</code>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  )
}

export default function PropMerging({ tick, appended, prepended, matched, deep }: Props) {
  const next = (only: string[]) =>
    router.reload({ data: { tick: tick + 1 }, only: [...only, 'tick'] })
  const reset = () => router.reload({ data: { tick: 0 }, only: [...ALL, 'tick'], reset: ALL })

  return (
    <AppLayout title="Prop Merging" description={`Four strategies for combining a partial reload with what the client has · tick ${tick}`}>
      <p className="mb-4 max-w-3xl text-sm text-slate-600">
        Every button does a partial reload with <code className="rounded bg-slate-100 px-1">tick + 1</code>. The
        server sends one new item per prop; the page object's <code className="rounded bg-slate-100 px-1">mergeProps</code>,{' '}
        <code className="rounded bg-slate-100 px-1">prependProps</code>, <code className="rounded bg-slate-100 px-1">deepMergeProps</code>{' '}
        and <code className="rounded bg-slate-100 px-1">matchPropsOn</code> tell the client how to combine it. Reset
        sends <code className="rounded bg-slate-100 px-1">X-Inertia-Reset</code> and the client replaces instead.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => next(ALL)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Reload all (tick {tick + 1})
        </button>
        <button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Reset
        </button>
      </div>

      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <Card title="Appended" code="merge(() => [item])">
          <ul className="divide-y divide-slate-100">
            {appended.map((item) => (
              <li key={`${item.id}-${item.stamp}`} className="py-1">
                {item.label} <span className="text-slate-400">· {item.stamp}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => next(['appended'])} className="mt-2 text-xs text-blue-600 hover:underline">
            append one
          </button>
        </Card>

        <Card title="Prepended" code="prepend(() => [item])">
          <ul className="divide-y divide-slate-100">
            {prepended.map((item) => (
              <li key={`${item.id}-${item.stamp}`} className="py-1">
                {item.label} <span className="text-slate-400">· {item.stamp}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => next(['prepended'])} className="mt-2 text-xs text-blue-600 hover:underline">
            prepend one
          </button>
        </Card>

        <Card title="Matched on id" code="merge(() => [...], { matchOn: 'id' })">
          <ul className="divide-y divide-slate-100">
            {matched.map((item) => (
              <li key={item.id} className="flex justify-between py-1">
                <span>
                  #{item.id} {item.label}
                </span>
                <span className="tabular-nums text-slate-500">count {item.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">#1 is re-sent every time with a new count: updated in place, never duplicated.</p>
          <button onClick={() => next(['matched'])} className="mt-1 text-xs text-blue-600 hover:underline">
            send again
          </button>
        </Card>

        <Card title="Deep merged" code="deepMerge(() => ({ counts, items }), { matchOn: 'items.id' })">
          <p className="text-xs text-slate-500">counts (keys accumulate, total is replaced)</p>
          <code className="block text-xs">{JSON.stringify(deep.counts)}</code>
          <p className="mt-2 text-xs text-slate-500">items (matched on id inside the object)</p>
          <ul className="divide-y divide-slate-100">
            {deep.items.map((item) => (
              <li key={item.id} className="flex justify-between py-1">
                <span>#{item.id}</span>
                <span className="tabular-nums text-slate-500">seen {item.seen}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => next(['deep'])} className="mt-2 text-xs text-blue-600 hover:underline">
            merge again
          </button>
        </Card>
      </div>
    </AppLayout>
  )
}
