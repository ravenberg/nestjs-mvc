import { Head, Link } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function HeadPage({ slug, title, summary, renderedAt }: { slug: string; title: string; summary: string; renderedAt: string }) {
  const [documentTitle, setDocumentTitle] = useState('')
  useEffect(() => {
    // Read back after Inertia has applied the <Head> elements.
    const id = setTimeout(() => setDocumentTitle(document.title), 50)
    return () => clearTimeout(id)
  }, [title])

  return (
    <AppLayout title="Head" description="Per-page <title> and <meta>, managed by the client and included in SSR output">
      <Head title={`${title} · NestJS MVC`}>
        <meta name="description" content={summary} />
        <meta property="og:title" content={title} />
        <link rel="canonical" href={`http://localhost:3000/features/layouts/head/${slug}`} />
      </Head>

      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-slate-600">{summary}</p>
        <p className="mt-3 text-xs text-slate-500">rendered {new Date(renderedAt).toLocaleTimeString()}</p>

        <div className="mt-4 flex gap-2">
          <Link href="/features/layouts/head/monolith" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            The monolith is back
          </Link>
          <Link href="/features/layouts/head/zero-api" className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Zero API
          </Link>
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-slate-500">document.title now</dt>
          <dd className="font-mono">{documentTitle}</dd>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          <code className="rounded bg-slate-100 px-1">&lt;Head&gt;</code> replaces the elements it owns on each visit (the
          browser tab title changes as you switch). On a server-rendered route the same elements come out of{' '}
          <code className="rounded bg-slate-100 px-1">ctx.head()</code> in the HTML shell, so crawlers see them too:
          this route is not <code className="rounded bg-slate-100 px-1">@Ssr()</code>; the Validation page is, compare View
          Source.
        </p>
      </section>
    </AppLayout>
  )
}
