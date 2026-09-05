import { Link, router, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function History({ secret, visitedAt }: { secret: { iban: string; note: string }; visitedAt: string }) {
  const page = usePage()
  const message = page.flash?.message as string | undefined

  return (
    <AppLayout title="History Management" description="Encrypt what the browser keeps of a page, and clear it on logout">
      {message && (
        <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
      )}

      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          Inertia stores each page's props in <code className="rounded bg-slate-100 px-1">history.state</code> so
          back/forward is instant. For sensitive pages that means the data survives a logout. This route has{' '}
          <code className="rounded bg-slate-100 px-1">@EncryptHistory()</code>, so the page object carries{' '}
          <code className="rounded bg-slate-100 px-1">encryptHistory: {String(page.encryptHistory ?? false)}</code>{' '}
          and the client encrypts the entry with a key it keeps in <code className="rounded bg-slate-100 px-1">sessionStorage</code>.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-500">IBAN</dt>
          <dd className="font-mono">{secret.iban}</dd>
          <dt className="text-slate-500">Note</dt>
          <dd>{secret.note}</dd>
          <dt className="text-slate-500">Visited</dt>
          <dd>{new Date(visitedAt).toLocaleTimeString()}</dd>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Go to Dashboard, then press Back
          </Link>
          <button
            onClick={() => router.post('/features/navigation/history/logout')}
            className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-900"
          >
            Log out (clearHistory)
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Try it: open DevTools → Application → Session Storage, note the history key; navigate away and back —
          the page still restores, because the key is there. Click "Log out": the POST calls{' '}
          <code className="rounded bg-slate-100 px-1">view.clearHistory().back()</code>, the next page object carries{' '}
          <code className="rounded bg-slate-100 px-1">clearHistory: true</code>, the key is rotated, and a Back to
          an earlier encrypted page falls back to a fresh request instead of the stored copy.
        </p>
      </section>
    </AppLayout>
  )
}
