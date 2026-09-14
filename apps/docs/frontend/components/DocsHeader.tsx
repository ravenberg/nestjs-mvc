export function DocsHeader({ title, section }: { title?: string; section?: string | null }) {
  if (!title && !section) return null

  return (
    <header className="mb-9 space-y-1">
      {section && <p className="font-display text-sm font-medium text-nest-500">{section}</p>}
      {title && <h1 className="font-display text-3xl tracking-tight text-neutral-900 dark:text-white">{title}</h1>}
    </header>
  )
}
