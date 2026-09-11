import clsx from 'clsx'
import { useId, type ComponentPropsWithoutRef } from 'react'
import { InstallationIcon } from './icons/InstallationIcon'
import { LightbulbIcon } from './icons/LightbulbIcon'
import { PluginsIcon } from './icons/PluginsIcon'
import { PresetsIcon } from './icons/PresetsIcon'
import { ThemingIcon } from './icons/ThemingIcon'
import { WarningIcon } from './icons/WarningIcon'

const icons = {
  installation: InstallationIcon,
  presets: PresetsIcon,
  plugins: PluginsIcon,
  theming: ThemingIcon,
  lightbulb: LightbulbIcon,
  warning: WarningIcon,
}

const iconStyles = {
  blue: '[--icon-foreground:var(--color-slate-900)] [--icon-background:var(--color-white)]',
  amber: '[--icon-foreground:var(--color-amber-900)] [--icon-background:var(--color-amber-100)]',
}

export type IconName = keyof typeof icons

export function Icon({
  icon,
  color = 'blue',
  className,
  ...props
}: { color?: keyof typeof iconStyles; icon: IconName } & Omit<ComponentPropsWithoutRef<'svg'>, 'color'>) {
  const id = useId()
  const IconComponent = icons[icon] ?? icons.lightbulb

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={clsx(className, iconStyles[color])} {...props}>
      <IconComponent id={id} color={color} />
    </svg>
  )
}

const gradients = {
  blue: [{ stopColor: '#0EA5E9' }, { stopColor: '#22D3EE', offset: '.527' }, { stopColor: '#818CF8', offset: 1 }],
  amber: [
    { stopColor: '#FDE68A', offset: '.08' },
    { stopColor: '#F59E0B', offset: '.837' },
  ],
}

export function Gradient({
  color = 'blue',
  ...props
}: { color?: keyof typeof gradients } & Omit<ComponentPropsWithoutRef<'radialGradient'>, 'color'>) {
  return (
    <radialGradient cx={0} cy={0} r={1} gradientUnits="userSpaceOnUse" {...props}>
      {gradients[color].map((stop, stopIndex) => (
        <stop key={stopIndex} {...stop} />
      ))}
    </radialGradient>
  )
}

export function LightMode({ className, ...props }: ComponentPropsWithoutRef<'g'>) {
  return <g className={clsx('dark:hidden', className)} {...props} />
}

export function DarkMode({ className, ...props }: ComponentPropsWithoutRef<'g'>) {
  return <g className={clsx('hidden dark:inline', className)} {...props} />
}
