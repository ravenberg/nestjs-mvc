import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const KEY = 'theme'

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * The stored theme and a setter. The shell's inline script applies the same
 * rule before the first paint, so the class is right before React runs; this
 * hook only keeps it right afterwards and follows the OS while on "system".
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const [theme, setState] = useState<Theme>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored === 'light' || stored === 'dark') setState(stored)
    } catch {
      // Storage may be unavailable; "system" is the right answer then.
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => {
      if ((localStorage.getItem(KEY) ?? 'system') === 'system') apply('system')
    }
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setState(next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Ignore: the class still switches for this visit.
    }
    apply(next)
  }, [])

  return { theme, setTheme }
}
