import { router, usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

const SECTIONS = ['profile', 'security', 'billing'] as const

export default function Fragments({ savedAt }: { savedAt: string }) {
  const page = usePage()
  const message = page.flash?.message as string | undefined

  return (
    <AppLayout title="URL Fragments" description="Redirects that land on a section, and forms that keep you on one">
      {message && (
        <div className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
      )}

      <section className="mb-4 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          An XHR follows a redirect without its <code className="rounded bg-slate-100 px-1">#fragment</code>. Two fixes
          in the protocol. <strong>Redirect to a section:</strong> the handler redirects to{' '}
          <code className="rounded bg-slate-100 px-1">/…#security</code>; the adapter answers{' '}
          <code className="rounded bg-slate-100 px-1">409</code> + <code className="rounded bg-slate-100 px-1">X-Inertia-Redirect</code>{' '}
          and the client visits it, fragment included. <strong>Stay on a section:</strong> a form on{' '}
          <code className="rounded bg-slate-100 px-1">#billing</code> posts and redirects back; the handler calls{' '}
          <code className="rounded bg-slate-100 px-1">preserveFragment()</code>, the page object carries{' '}
          <code className="rounded bg-slate-100 px-1">preserveFragment: true</code>, and the URL keeps{' '}
          <code className="rounded bg-slate-100 px-1">#billing</code>. Watch the address bar and the Network tab.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => router.post('/features/navigation/fragments/jump', { to: section })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            >
              Redirect to #{section}
            </button>
          ))}
        </div>
      </section>

      {SECTIONS.map((section) => (
        <section
          key={section}
          id={section}
          className="mb-4 max-w-2xl scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm target:border-blue-400 target:ring-2 target:ring-blue-100"
          style={{ minHeight: '60vh' }}
        >
          <h2 className="font-semibold capitalize">{section}</h2>
          <p className="mt-1 text-slate-500">
            #{section} · last saved {new Date(savedAt).toLocaleTimeString()}
          </p>
          <button
            onClick={() =>
              router.post(`/features/navigation/fragments/save#${section}`, { section }, { preserveScroll: true })
            }
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Save {section} (preserveFragment)
          </button>
        </section>
      ))}
    </AppLayout>
  )
}
