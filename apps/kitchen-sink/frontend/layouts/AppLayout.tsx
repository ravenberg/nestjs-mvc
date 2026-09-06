import type { ReactNode } from 'react'
import { Sidebar } from '../components/Sidebar'

interface Props {
  title: string
  description?: string
  children: ReactNode
}

export function AppLayout({ title, description, children }: Props) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-8 py-5">
          <h1 className="text-lg font-semibold">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
