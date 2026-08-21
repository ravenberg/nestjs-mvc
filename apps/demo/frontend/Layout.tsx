import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/users">Users (deferred)</Link>
      </nav>
      {children}
    </>
  )
}
