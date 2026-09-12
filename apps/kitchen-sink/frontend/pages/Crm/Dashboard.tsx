import { Deferred, Link, usePage } from 'nestjs-mvc/react'
import { AppLayout } from '../../layouts/AppLayout'
import { DemoLink } from '../../components/DemoLink'

interface Activity {
  id: number
  body: string
  createdAt: string
  user: { id: number; name: string }
  contact: { id: number; name: string }
}

interface Props {
  /** A once prop: resolved on the first visit, then kept by the client. */
  you: { name: string; notes: number }
  totalContacts?: number
  totalOrganizations?: number
  recentNotesCount?: number
  recentActivity: Activity[]
}

function StatCard({ label, data, value }: { label: string; data: string; value?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">{label}</p>
      <Deferred
        data={data}
        fallback={<div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200" />}
      >
        <p className="mt-2 text-4xl font-semibold tabular-nums">{value}</p>
      </Deferred>
    </div>
  )
}

export default function Dashboard({
  you,
  totalContacts,
  totalOrganizations,
  recentNotesCount,
  recentActivity,
}: Props) {
  const page = usePage<{ auth?: { user?: { verified?: boolean } | null } }>()
  const flash = page.flash as { message?: string; demoLink?: string } | undefined
  const verified = page.props.auth?.user?.verified ?? true

  return (
    <AppLayout title="Dashboard" description={`Welcome back, ${you.name}. You have written ${you.notes} notes.`}>
      {flash?.message && (
        <div role="status" className="mb-4 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {flash.message}
        </div>
      )}
      <DemoLink href={flash?.demoLink} label="Verification link" />
      {!verified && (
        <div className="mb-6 flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Your email address is not verified yet.</span>
          <Link
            href="/verify-email/resend"
            method="post"
            as="button"
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100"
          >
            Send a new link
          </Link>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total Contacts" data="totalContacts" value={totalContacts} />
        <StatCard label="Organizations" data="totalOrganizations" value={totalOrganizations} />
        <StatCard label="Notes This Week" data="recentNotesCount" value={recentNotesCount} />
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Recent Activity</h2>
        <p className="text-sm text-slate-500">Latest notes added across all contacts</p>

        <ul className="mt-4 divide-y divide-slate-100">
          {recentActivity.map((activity) => (
            <li key={activity.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  <span className="text-slate-500">added a note on</span>{' '}
                  <Link href={`/contacts/${activity.contact.id}`} className="text-blue-600 hover:underline">
                    {activity.contact.name}
                  </Link>
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{activity.body}</p>
              </div>
              <time className="shrink-0 text-xs text-slate-400">
                {new Date(activity.createdAt).toLocaleDateString('en-GB')}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </AppLayout>
  )
}
