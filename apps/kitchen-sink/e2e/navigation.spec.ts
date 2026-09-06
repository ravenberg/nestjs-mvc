import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('Links: GET tabs, and POST/PUT/PATCH/DELETE without a form', async ({ page }) => {
    await page.goto('/features/navigation/links')
    await page.getByRole('link', { name: 'details', exact: true }).click()
    await expect(page).toHaveURL(/tab=details/)
    await expect(page.getByText('Current tab prop: details')).toBeVisible()

    const flashes: [string, string][] = [
      ['POST', 'POST received; redirected back with 302.'],
      ['PUT', 'PUT received; redirected back with 303 so the follow-up is a GET.'],
      ['PATCH', 'PATCH received; 303 back.'],
      ['DELETE', 'DELETE received; 303 back.'],
    ]
    for (const [method, flash] of flashes) {
      await page.getByRole('button', { name: method, exact: true }).click()
      await expect(page.getByText(flash)).toBeVisible()
    }
    await expect(page.getByRole('listitem').filter({ hasText: '"title":"New item"' }).first()).toBeVisible()
  })

  test('Preserve State: the same component instance keeps a draft, a plain visit remounts', async ({ page }) => {
    await page.goto('/features/navigation/preserve-state')
    const draft = page.getByPlaceholder('Type, then switch tabs…')
    await draft.fill('unsaved draft')

    const tabs = (heading: string) => page.getByRole('heading', { name: heading, exact: true }).locator('..')
    await tabs('preserveState').getByRole('link', { name: 'billing' }).click()
    await expect(page.getByText('Current tab: billing')).toBeVisible()
    await expect(draft).toHaveValue('unsaved draft')

    await tabs('default').getByRole('link', { name: 'team' }).click()
    await expect(page.getByText('Current tab: team')).toBeVisible()
    await expect(draft).toHaveValue('')
  })

  test('Preserve Scroll: preserveScroll keeps the position, a plain visit resets it', async ({ page }) => {
    await page.goto('/features/navigation/preserve-scroll')
    const row = page.getByRole('listitem').filter({ hasText: /^30\./ })
    await row.scrollIntoViewIfNeeded()
    await row.getByRole('link', { name: 'preserveScroll' }).click()
    await expect(page.getByText('Highlighted: 30')).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

    await row.getByRole('link', { name: 'plain visit' }).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('History: the route asks for encryption, logout clears the history', async ({ page }) => {
    await page.goto('/features/navigation/history')
    await expect(page.getByText('encryptHistory: true')).toBeVisible()
    await page.getByRole('button', { name: 'Log out (clearHistory)' }).click()
    await expect(page.getByText('History cleared: the key was rotated and stored pages are gone.')).toBeVisible()
  })

  test('Redirects: 302 followed as a visit, back(), and 303 after PUT', async ({ page }) => {
    await page.goto('/features/navigation/redirects')
    await page.getByRole('link', { name: 'internal', exact: true }).click()
    await expect(page).toHaveURL(/from=internal/)
    await expect(page.getByText('Arrived from: internal')).toBeVisible()
    await expect(page.getByText('Redirected with 302 to an Inertia page; the client followed it as a visit.')).toBeVisible()

    await page.getByRole('link', { name: 'back', exact: true }).click()
    await expect(page.getByText('back(): redirected to the Referer.')).toBeVisible()

    await page.getByRole('button', { name: 'put', exact: true }).click()
    await expect(page).toHaveURL(/from=put/)
    await expect(page.getByText('After a PUT the redirect is 303, so the browser makes a GET.')).toBeVisible()
  })

  test('URL Fragments: a redirect lands on a section, a save keeps you on one', async ({ page }) => {
    await page.goto('/features/navigation/fragments')
    await page.getByRole('button', { name: 'Redirect to #security' }).click()
    await expect(page).toHaveURL(/#security$/)
    await expect(page.getByText('Redirected to #security.')).toBeVisible()

    await page.getByRole('button', { name: 'Save billing (preserveFragment)' }).click()
    await expect(page.getByText('Saved the billing section; you are still on it.')).toBeVisible()
    await expect(page).toHaveURL(/#billing$/)
  })
})
