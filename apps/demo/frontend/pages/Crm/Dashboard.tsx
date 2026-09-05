import { Deferred, Link } from '@inertiajs/react'
import { AppLayout } from '../../layouts/AppLayout'

interface Activity {
  id: number
  body: string
  createdAt: string
  user: { id: number; name: string }
  contact: { id: number; name: string }
}

interface Props {
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
  totalContacts,
  totalOrganizations,
  recentNotesCount,
  recentActivity,
}: Props) {
  return (
    <AppLayout title="Dashboard">
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
