import clsx from 'clsx'
import { FRAMEWORKS, switchFramework, useFramework } from '../lib/framework'

/**
 * React | Vue. The highlighted option comes from CSS (`data-framework` on
 * <html>, see app.css), so it is right before any JavaScript runs; `aria-pressed`
 * follows once the page is interactive.
 */
export function FrameworkSwitch({ className }: { className?: string }) {
  const active = useFramework()

  return (
    <div
      role="group"
      aria-label="Frontend framework"
      className={clsx('inline-flex rounded-lg p-0.5 text-xs font-medium ring-1 ring-neutral-200 dark:ring-white/10', className)}
    >
      {FRAMEWORKS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          data-framework-option={value}
          aria-pressed={active === value}
          onClick={(event) => switchFramework(value, event.currentTarget)}
          className="cursor-pointer rounded-md px-2.5 py-1 text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
