import { Deferred, Link, usePage } from '@inertiajs/react'
import { Bell, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { navigation, type NavGroup } from '../navigation'

function isActive(currentUrl: string, href?: string): boolean {
  if (!href) return false
  return currentUrl === href || currentUrl.startsWith(`${href}/`)
}

function CollapsibleGroup({ group, currentUrl }: { group: NavGroup; currentUrl: string }) {
  const hasActiveChild = group.items?.some((item) => isActive(currentUrl, item.href)) ?? false
  const [open, setOpen] = useState(hasActiveChild)
  const Icon = group.icon

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        <Icon className="size-4 shrink-0 text-slate-500" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <ul className="mt-1 ml-7 space-y-0.5 border-l border-slate-200 pl-3">
          {group.items?.map((item) =>
            item.href ? (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-2 py-1.5 text-sm ${
                    isActive(currentUrl, item.href)
                      ? 'bg-blue-50 font-medium text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ) : (
              <li
                key={item.label}
                title="Not built yet"
                className="cursor-not-allowed px-2 py-1.5 text-sm text-slate-400"
              >
                {item.label}
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  )
}

export function Sidebar() {
  const { url, props } = usePage<{
    auth?: {
      user?: { name: string; email: string } | null
      notifications?: { id: number; body: string }[]
    }
  }>()
  const user = props.auth?.user
  const notifications = props.auth?.notifications

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid size-8 place-items-center rounded-lg bg-blue-600 font-bold text-white">
          N
        </span>
        <span className="font-semibold text-slate-900">NestJS MVC</span>

        {/* Nested deferred prop: announced as `auth.notifications` and fetched
            after the first paint. Proves dot-notation works end to end. */}
        <Deferred
          data="auth.notifications"
          fallback={<span className="ml-auto size-4 animate-pulse rounded-full bg-slate-200" />}
        >
          <span
            className="ml-auto flex items-center gap-1 text-xs text-slate-500"
            title={`${notifications?.length ?? 0} recent notes by you`}
          >
            <Bell className="size-4" />
            {notifications?.length ?? 0}
          </span>
        </Deferred>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {navigation.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-slate-500">{section.label}</p>
            <ul className="space-y-0.5">
              {section.groups.map((group) =>
                group.href ? (
                  <li key={group.label}>
                    <Link
                      href={group.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        isActive(url, group.href)
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <group.icon
                        className={`size-4 shrink-0 ${isActive(url, group.href) ? 'text-blue-600' : 'text-slate-500'}`}
                      />
                      {group.label}
                    </Link>
                  </li>
                ) : (
                  <CollapsibleGroup key={group.label} group={group} currentUrl={url} />
                ),
              )}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
          <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {user.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
