import { expect, type Page } from '@playwright/test'

/** Collects console errors and uncaught exceptions; assert with `expectClean()`. */
export function watchErrors(page: Page): { expectClean: () => void } {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return {
    expectClean: () => expect(errors, 'no console errors or uncaught exceptions').toEqual([]),
  }
}

/** Marks the document so a later check can tell an Inertia visit from a full reload. */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __e2eMarker: number }).__e2eMarker = Date.now()
  })
}

export async function isSameDocument(page: Page): Promise<boolean> {
  return page.evaluate(() => typeof (window as unknown as { __e2eMarker?: number }).__e2eMarker === 'number')
}

/** The page object the client currently holds, straight from the adapter's DOM state. */
export async function currentComponent(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.getElementById('app')
    return el?.dataset.page ? (JSON.parse(el.dataset.page) as { component: string }).component : ''
  })
}
