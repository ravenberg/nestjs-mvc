import { expect, test } from '@playwright/test'

test.describe('Prefetching', () => {
  test('a hovered link is fetched before the click, so the page is served from the cache', async ({ page }) => {
    await page.goto('/features/prefetching/links')
    const link = page.getByRole('link', { name: 'page 1' })
    await link.hover()
    // 75 ms hover delay + the 400 ms the page takes, with margin: the target page
    // calls anything older than 0.6 s "from the prefetch cache".
    await page.waitForTimeout(1500)
    await link.click()
    await expect(page).toHaveURL(/\/links\/page\/1$/)
    await expect(page.getByText('came from the prefetch cache')).toBeVisible()
    await expect(page.getByText('isPrefetched true')).toBeVisible()
  })

  test('a plain link is rendered for the click', async ({ page }) => {
    await page.goto('/features/prefetching/links')
    await page.getByRole('link', { name: 'page 5' }).click()
    await expect(page.getByText('rendered for this click')).toBeVisible()
    await expect(page.getByText('isPrefetched false')).toBeVisible()
  })

  test('Cache management: repricing invalidates the tagged product pages', async ({ page }) => {
    await page.goto('/features/prefetching/cache')
    await page.getByRole('link', { name: 'Keyboard' }).click()
    await expect(page).toHaveURL(/\/products\/1$/)
    const price = page.getByText(/^€\d+$/)
    const before = Number((await price.innerText()).slice(1))

    await page.getByRole('button', { name: "+€10 (invalidates 'products')" }).click()
    await expect(page.getByText(`Keyboard is now €${before + 10}.`)).toBeVisible()
    await expect(price).toHaveText(`€${before + 10}`)

    await page.getByRole('link', { name: 'Products list' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: 'Keyboard' })).toContainText(`€${before + 10}`)
  })
})

test.describe('State', () => {
  test('Remember: useRemember state survives Back, plain component state does not', async ({ page }) => {
    await page.goto('/features/state/remember')
    const section = (title: string) => page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) })
    await section('useRemember').getByLabel('Search').fill('remembered query')
    await section('useRemember').getByLabel('Sort').selectOption('date')
    await section('Without useRemember (for contrast)').getByLabel('Search').fill('forgotten query')

    await page.getByRole('link', { name: 'visit the Dashboard' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.goBack()

    await expect(section('useRemember').getByLabel('Search')).toHaveValue('remembered query')
    await expect(section('useRemember').getByLabel('Sort')).toHaveValue('date')
    await expect(section('Without useRemember (for contrast)').getByLabel('Search')).toHaveValue('')
  })

  test('Flash: shown on the next render, gone on the one after, and the flash event fires', async ({ page }) => {
    await page.goto('/features/state/flash')
    // Exact matches: the page also dumps page.flash as JSON in a <pre>.
    const message = page.getByText('A plain message, shown once.', { exact: true })
    await page.getByRole('button', { name: 'POST → flash a message' }).click()
    await expect(message).toBeVisible()
    await expect(page.getByText(/flash event: message/)).toBeVisible()

    await page.getByRole('link', { name: 'Plain visit (nothing flashed)' }).click()
    await expect(page.getByRole('heading', { name: 'Flash Data' })).toBeVisible()
    await expect(message).toHaveCount(0)

    await page.getByRole('button', { name: 'router.flash() client-side' }).click()
    await expect(page.getByText('Set on the client with router.flash(); same page.flash, no request.', { exact: true })).toBeVisible()
  })

  test('Shared props: the user from auth.share, notifications from middleware, locale from the handler', async ({ page }) => {
    await page.goto('/features/state/shared-props')
    await expect(page.locator('dd', { hasText: '"auth"' })).toContainText('"locale"')
    // auth.user comes from `auth.share` (after the guards), and the sidebar's
    // notification count from the middleware's deferred closure.
    await expect(page.getByText('Test User · test@example.com')).toBeVisible()
    await expect(page.locator('aside').getByTitle(/recent notes by you/)).toBeVisible()
  })
})
