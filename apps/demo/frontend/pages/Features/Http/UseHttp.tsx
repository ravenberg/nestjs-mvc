import { useHttp } from '@inertiajs/react'
import { useEffect } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

interface SearchResponse {
  query: string
  results: string[]
  at: string
}

interface EchoResponse {
  received: { name: string; amount: number }
  total: number
  at: string
}

export default function UseHttp({ renderedAt }: { renderedAt: string }) {
  // A GET that returns JSON, not a page: no visit, no page swap.
  const search = useHttp<{ q: string }, SearchResponse>('get', '/features/http/cities', { q: '' })
  // A POST with the same helper surface as useForm: data, errors, processing, response.
  const echo = useHttp<{ name: string; amount: string }, EchoResponse>('post', '/features/http/echo', { name: '', amount: '' })

  useEffect(() => {
    const id = setTimeout(() => search.submit(), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data.q])

  const input = (error?: string) =>
    `mt-1 block w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 ${error ? 'border-red-400' : 'border-slate-300'}`

  return (
    <AppLayout title="useHttp" description="Talk to a JSON endpoint from an Inertia page, with the form ergonomics you already know">
      <div className="grid max-w-5xl gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="font-semibold">Typeahead (GET)</h2>
          <p className="mt-1 text-slate-600">
            Not every request is a page. <code className="rounded bg-slate-100 px-1">useHttp()</code> calls an ordinary Nest
            handler without <code className="rounded bg-slate-100 px-1">@View()</code> and gives you the JSON; the page stays
            as it is. Rendered at {new Date(renderedAt).toLocaleTimeString()}.
          </p>
          <input
            value={search.data.q}
            onChange={(e) => search.setData('q', e.target.value)}
            placeholder="Type a city…"
            className={`${input()} mt-3`}
          />
          <ul className="mt-2 min-h-24 divide-y divide-slate-100">
            {search.response?.results.map((c) => (
              <li key={c} className="py-1">{c}</li>
            ))}
            {search.response && search.response.results.length === 0 && <li className="py-1 text-slate-400">no match</li>}
          </ul>
          <p className="text-xs text-slate-500">
            {search.processing ? 'searching…' : search.response ? `${search.response.results.length} results at ${new Date(search.response.at).toLocaleTimeString()}` : ''}
          </p>
        </section>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            echo.submit()
          }}
          className="rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <h2 className="font-semibold">Mutation (POST) with validation</h2>
          <p className="mt-1 text-slate-600">
            Errors arrive like a form's: the endpoint answers <code className="rounded bg-slate-100 px-1">422</code> with{' '}
            <code className="rounded bg-slate-100 px-1">{'{ errors }'}</code>, the Laravel convention the client expects for
            JSON, and <code className="rounded bg-slate-100 px-1">echo.errors</code> fills in. Success lands in{' '}
            <code className="rounded bg-slate-100 px-1">echo.response</code>.
          </p>
          <label className="mt-3 block">
            <span className="text-slate-700">Name</span>
            <input value={echo.data.name} onChange={(e) => echo.setData('name', e.target.value)} className={input(echo.errors.name)} />
            {echo.errors.name && <span className="mt-1 block text-xs text-red-600">{echo.errors.name}</span>}
          </label>
          <label className="mt-3 block">
            <span className="text-slate-700">Amount (excl. VAT)</span>
            <input value={echo.data.amount} onChange={(e) => echo.setData('amount', e.target.value)} className={input(echo.errors.amount)} />
            {echo.errors.amount && <span className="mt-1 block text-xs text-red-600">{echo.errors.amount}</span>}
          </label>
          <button type="submit" disabled={echo.processing} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {echo.processing ? 'Sending…' : 'Send JSON'}
          </button>
          {echo.response && (
            <pre className="mt-4 overflow-x-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(echo.response, null, 2)}</pre>
          )}
        </form>
      </div>
    </AppLayout>
  )
}
