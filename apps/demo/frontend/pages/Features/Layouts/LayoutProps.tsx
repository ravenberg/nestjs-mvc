import { Link, setLayoutProps } from '@inertiajs/react'
import { PersistentLayout } from '../../../layouts/PersistentLayout'

const ACCENTS: Record<string, string> = { light: '#2563eb', dark: '#f59e0b', ocean: '#0891b2' }

function LayoutProps({ theme, renderedAt }: { theme: 'light' | 'dark' | 'ocean'; renderedAt: string }) {
  // The page tells its persistent layout what to look like, without owning it.
  setLayoutProps({ title: `Layout Props · ${theme}`, theme, accent: ACCENTS[theme] })

  return (
    <div className="text-sm">
      <p>
        Theme <strong>{theme}</strong>, rendered at {new Date(renderedAt).toLocaleTimeString()}.
      </p>
      <p className="mt-2 opacity-80">
        The layout is persistent (see the clock), yet each page can change how it looks:{' '}
        <code className="rounded bg-black/5 px-1">setLayoutProps({'{'} title, theme, accent {'}'})</code> feeds props to the
        layout component that <code className="rounded bg-black/5 px-1">Page.layout</code> named, and they are reset on
        the next page that does not set them.
      </p>
      <div className="mt-4 flex gap-2">
        {(['light', 'dark', 'ocean'] as const).map((t) => (
          <Link
            key={t}
            href={`/features/layouts/props/${t}`}
            className={`rounded-lg border px-3 py-1.5 ${t === theme ? 'border-current font-medium' : 'border-current/30 hover:border-current'}`}
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  )
}

// The component form: the adapter passes the layout-props store into it.
LayoutProps.layout = PersistentLayout

export default LayoutProps
