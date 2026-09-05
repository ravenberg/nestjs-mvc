import { usePage } from '@inertiajs/react'
import { AppLayout } from '../../../layouts/AppLayout'

export default function SharedProps({ pageOnly }: { pageOnly: string }) {
  const page = usePage()
  const shared = page.sharedProps ?? []
  const auth = page.props.auth as { user?: { name: string; email: string } | null } | undefined
  const locale = page.props.locale as { code: string; timezone: string } | undefined

  return (
    <AppLayout title="Shared Props" description="Props every page gets, and how the client knows which ones they are">
      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm">
        <p className="text-slate-600">
          <code className="rounded bg-slate-100 px-1">auth</code> is shared for every page by a middleware (the
          sidebar reads it); <code className="rounded bg-slate-100 px-1">locale</code> is shared by this page's handler
          with <code className="rounded bg-slate-100 px-1">view.share()</code>. The page object lists their keys under{' '}
          <code className="rounded bg-slate-100 px-1">sharedProps</code>, so when you click a sidebar link the client can
          keep them while it shows the next page's placeholder — the sidebar never blanks.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-slate-500">sharedProps</dt>
          <dd>
            <code className="text-xs">{JSON.stringify(shared)}</code>
          </dd>
          <dt className="text-slate-500">auth.user</dt>
          <dd>{auth?.user ? `${auth.user.name} · ${auth.user.email}` : 'none'}</dd>
          <dt className="text-slate-500">locale</dt>
          <dd>{locale ? `${locale.code} · ${locale.timezone}` : 'none'}</dd>
          <dt className="text-slate-500">pageOnly</dt>
          <dd>{pageOnly}</dd>
        </dl>

        <p className="mt-4 text-xs text-slate-500">
          Middleware shares through <code className="rounded bg-slate-100 px-1">requestState(req).shared</code>,
          handlers and guards through <code className="rounded bg-slate-100 px-1">ViewService.share()</code>; both end up
          in the same place. Set <code className="rounded bg-slate-100 px-1">exposeSharedProps: false</code> on the module
          to leave the list out.
        </p>
      </section>
    </AppLayout>
  )
}
