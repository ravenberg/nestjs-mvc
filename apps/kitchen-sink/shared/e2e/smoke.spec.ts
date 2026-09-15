import { expect, test } from '@playwright/test'
import { navigation } from '../navigation'
import { isSameDocument, markDocument, watchErrors } from './helpers'

/** Every sidebar entry with a link: the whole kitchen sink plus the CRM pages. */
const pages = navigation.flatMap((section) =>
  section.groups.flatMap((group) => [
    ...(group.href ? [{ label: group.label, href: group.href, group: null }] : []),
    ...(group.items ?? [])
      .filter((item) => item.href)
      .map((item) => ({ label: item.label, href: item.href!, group: group.label })),
  ]),
)

test.describe('every page', () => {
  for (const { label, href } of pages) {
    test(`${label} renders on a first load without errors`, async ({ page }) => {
      const errors = watchErrors(page)
      const response = await page.goto(href)
      expect(response?.status(), `${href} answers 200`).toBe(200)
      await expect(page.locator('h1').first()).not.toBeEmpty()
      await expect(page.locator('main')).toBeVisible()
      errors.expectClean()
    })
  }
})

test('runs on the platform and framework this app is for', async ({ request }, testInfo) => {
  // Express announces itself, Fastify does not: proof the suite is not testing another app.
  const response = await request.get('/features/forms/file-uploads')
  const platform = testInfo.config.metadata.platform as string
  expect(response.headers()['x-powered-by']).toBe(platform === 'express' ? 'Express' : undefined)
  expect(await response.text()).toContain(`"platform":"${platform}"`)
  expect(await response.text()).toContain(`"framework":"${testInfo.config.metadata.framework as string}"`)
})

test('the sidebar navigates every page as an Inertia visit, never a full reload', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/dashboard')
  await markDocument(page)

  for (const { href, group } of pages) {
    const path = href.split('?')[0]
    const link = page.locator(`aside a[href="${href}"]`).first()
    // Collapsed groups only render their links once opened.
    if (group && !(await link.isVisible())) await page.locator('aside button', { hasText: group }).click()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`))
    await expect(page.locator('h1').first()).not.toBeEmpty()
    expect(await isSameDocument(page), `${href} was an Inertia visit`).toBe(true)
  }
  errors.expectClean()
})
