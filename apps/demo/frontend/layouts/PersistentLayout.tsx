import { Link, usePage } from '@inertiajs/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AppLayout } from './AppLayout'

/**
 * A persistent layout: assigned through `Page.layout`, so React keeps this
 * component mounted while the page inside it changes. The counter and the
 * clock below prove it — they would restart on every visit otherwise.
 * `title`, `theme` and `accent` can be set by the page through layout props.
 */
export function PersistentLayout({
  children,
  title = 'Persistent layout',
  theme = 'light',
  accent,
}: {
  children: ReactNode
  title?: string
  theme?: 'light' | 'dark' | 'ocean'
  accent?: string
}) {
  const { url } = usePage()
  const [seconds, setSeconds] = useState(0)
  const [visits, setVisits] = useState(0)
  const lastUrl = useRef<string | null>(null)
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  // Counts page swaps inside this layout without remounting it.
  useEffect(() => {
    if (lastUrl.current === url) return
    lastUrl.current = url
    setVisits((v) => v + 1)
  }, [url])

  const themes = {
    light: 'border-slate-200 bg-white text-slate-900',
    dark: 'border-slate-700 bg-slate-900 text-slate-100',
    ocean: 'border-cyan-300 bg-cyan-50 text-cyan-950',
  }

  return (
    <AppLayout title={title} description="This frame stays mounted across visits; only the page inside it changes">
      <div className={`max-w-3xl rounded-xl border p-5 ${themes[theme]}`} style={accent ? { boxShadow: `inset 4px 0 0 ${accent}` } : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
          <span>
            layout mounted for <strong className="tabular-nums">{seconds}s</strong> · pages shown inside it: <strong>{visits}</strong> · theme {theme}
          </span>
          <span className="flex gap-2">
            <Link href="/features/layouts/persistent/first" className="underline">first</Link>
            <Link href="/features/layouts/persistent/second" className="underline">second</Link>
            <Link href="/features/layouts/persistent/third" className="underline">third</Link>
            <Link href="/features/layouts/props/dark" className="underline">props: dark</Link>
          </span>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </AppLayout>
  )
}
