import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

const styles = {
  note: {
    container: 'bg-neutral-100/70 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-white/10',
    title: 'text-nest-600 dark:text-nest-400',
    body: 'text-neutral-700 [--tw-prose-background:var(--color-neutral-100)] prose-a:text-neutral-900 prose-code:text-neutral-900 dark:text-neutral-300 dark:prose-code:text-neutral-300',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-neutral-900 dark:ring-1 dark:ring-white/10',
    title: 'text-amber-900 dark:text-amber-500',
    body: 'text-amber-800 [--tw-prose-underline:var(--color-amber-400)] [--tw-prose-background:var(--color-amber-50)] prose-a:text-amber-900 prose-code:text-amber-900 dark:text-neutral-300 dark:[--tw-prose-underline:var(--color-nest-700)] dark:prose-code:text-neutral-300',
  },
}

export function Callout({ title, children, type = 'note' }: { title: string; children: ReactNode; type?: keyof typeof styles }) {
  return (
    <div className={clsx('my-8 flex rounded-3xl p-6', styles[type].container)}>
      {type === 'warning' ? (
        <Icon icon="warning" color="amber" className="h-8 w-8 flex-none" />
      ) : (
        <Icon icon="lightbulb" className="h-8 w-8 flex-none" />
      )}
      <div className="ml-4 flex-auto">
        <p className={clsx('not-prose font-display text-xl', styles[type].title)}>{title}</p>
        <div className={clsx('prose mt-2.5', styles[type].body)}>{children}</div>
      </div>
    </div>
  )
}
