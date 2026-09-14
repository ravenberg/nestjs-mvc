import { Link } from 'nestjs-mvc/react'
import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

const variantStyles = {
  primary:
    'rounded-[10px] bg-nest-500 py-2 px-4 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(234,40,69,0.18)] hover:bg-nest-400 hover:shadow-[0_6px_18px_rgba(234,40,69,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nest-500/50 active:bg-nest-600',
  secondary:
    'rounded-[10px] bg-neutral-800 py-2 px-4 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-neutral-400',
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
