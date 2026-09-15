import { useSyncExternalStore } from 'react'

export type Framework = 'react' | 'vue'

export const FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

const KEY = 'framework'
const EVENT = 'frameworkchange'

function current(): Framework {
  return document.documentElement.dataset.framework === 'vue' ? 'vue' : 'react'
}

/**
 * Switches every framework-specific block on the site at once. The choice is a
 * data attribute on <html>, which the shell's inline script sets before the
 * first paint from the stored value, and CSS hides the other framework. The
 * server renders one document and nothing re-renders on a switch.
 *
 * Pass the element the reader clicked to keep it in the same place on screen,
 * because the code above it changes height.
 */
export function switchFramework(next: Framework, anchor?: Element | null): void {
  const before = anchor?.getBoundingClientRect().top
  document.documentElement.dataset.framework = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Storage may be unavailable; the switch still holds for this visit.
  }
  if (anchor && before !== undefined) window.scrollBy(0, anchor.getBoundingClientRect().top - before)
  window.dispatchEvent(new Event(EVENT))
}

/** The active framework, for state that CSS cannot express (such as `aria-pressed`). React on the server. */
export function useFramework(): Framework {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange)
      return () => window.removeEventListener(EVENT, onChange)
    },
    current,
    () => 'react',
  )
}
