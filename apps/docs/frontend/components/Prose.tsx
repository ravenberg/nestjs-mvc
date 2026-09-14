import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

export function Prose({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={clsx(
        className,
        'prose max-w-none prose-neutral dark:text-neutral-400 dark:prose-invert',
        // headings
        'prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-34',
        // lead
        'prose-lead:text-neutral-500 dark:prose-lead:text-neutral-400',
        // links
        'prose-a:font-semibold prose-a:text-nest-600 dark:prose-a:text-nest-400',
        // link underline
        'dark:[--tw-prose-background:var(--color-neutral-950)] prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,var(--color-nest-300))] prose-a:hover:[--tw-prose-underline-size:6px] dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,var(--color-nest-800))] dark:prose-a:hover:[--tw-prose-underline-size:6px]',
        // pre
        'prose-pre:rounded-xl prose-pre:bg-[#1d1d1d] prose-pre:shadow-lg prose-pre:ring-1 prose-pre:ring-white/8 dark:prose-pre:bg-[#151112] dark:prose-pre:shadow-none',
        // hr
        'dark:prose-hr:border-neutral-800',
      )}
      {...props}
    />
  )
}
