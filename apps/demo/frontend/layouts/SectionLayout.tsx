import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

/** The inner of a nested layout pair: a tab strip that persists across its section pages. */
export function SectionLayout({ children, current }: { children: ReactNode; current?: string }) {
  const tabs = ['overview', 'members', 'settings']
  return (
    <div>
      <nav className="flex gap-1 border-b border-slate-200 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/features/layouts/nested/${tab}`}
            className={`-mb-px border-b-2 px-3 py-2 ${current === tab ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab}
          </Link>
        ))}
      </nav>
      <div className="pt-4">{children}</div>
    </div>
  )
}
