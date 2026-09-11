import { Link } from 'nestjs-mvc/react'
import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

const variantStyles = {
  primary:
    'rounded-full bg-sky-300 py-2 px-4 text-sm font-semibold text-slate-900 hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/50 active:bg-sky-500',
  secondary:
    'rounded-full bg-slate-800 py-2 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400',
}

type ButtonProps = { variant?: keyof typeof variantStyles; className?: string } & (
  | { href: string; children: React.ReactNode }
  | (ComponentPropsWithoutRef<'button'> & { href?: undefined })
)

/** A link for internal routes (Inertia visit), a plain anchor for external ones, a button otherwise. */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  className = clsx(variantStyles[variant], className)
  if (props.href === undefined) return <button className={className} {...props} />
  if (/^https?:/.test(props.href)) {
    return (
      <a className={className} href={props.href}>
        {props.children}
      </a>
    )
  }
  return (
    <Link className={className} href={props.href}>
      {props.children}
    </Link>
  )
}
