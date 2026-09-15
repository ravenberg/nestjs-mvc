import type { ReactNode } from 'react'
import { FrameworkSwitch } from './FrameworkSwitch'

/**
 * A page example in React and in Vue. Both are rendered; the site-wide switch
 * decides which one shows (the Markdoc schema wraps each fence in
 * `framework-react` or `framework-vue`).
 */
export function FrameworkCode({ children }: { children: ReactNode }) {
  return (
    <div className="framework-code">
      <div className="not-prose -mb-4 flex justify-end">
        <FrameworkSwitch />
      </div>
      {children}
    </div>
  )
}
