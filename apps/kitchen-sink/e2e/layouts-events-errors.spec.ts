import { expect, test } from '@playwright/test'

test.describe('Layouts & Head', () => {
  test('a persistent layout stays mounted across visits and takes layout props', async ({ page }) => {
    await page.goto('/features/layouts/persistent/first')
    const frame = page.getByText(/layout mounted for \d+s · pages shown inside it: \d+/)
    await expect(frame).toContainText('pages shown inside it: 1')

    await page.getByRole('link', { name: 'second', exact: true }).click()
    await expect(page.getByText('Page second, rendered on the server')).toBeVisible()
    await expect(frame).toContainText('pages shown inside it: 2')

    await page.getByRole('link', { name: 'props: dark' }).click()
    await expect(page.getByRole('heading', { name: 'Layout Props · dark' })).toBeVisible()
    await expect(frame).toContainText('theme dark')
    await expect(frame).toContainText('pages shown inside it: 3')
  })

  test('nested layouts keep both frames while switching tabs', async ({ page }) => {
    await page.goto('/features/layouts/nested/overview')
    await page.locator('main nav').getByRole('link', { name: 'members' }).click()
    await expect(page.getByText('Section members, rendered at')).toBeVisible()
    await expect(page.getByText(/pages shown inside it: 2/)).toBeVisible()
  })

  test('<Head> swaps the title and meta per page', async ({ page }) => {
    await page.goto('/features/layouts/head/monolith')
    await expect(page).toHaveTitle('The monolith is back · NestJS MVC')
    await page.getByRole('link', { name: 'Zero API' }).click()
    await expect(page).toHaveTitle('Zero API · NestJS MVC')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /request\/response cycle/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/head\/zero-api$/)
  })
})

test.describe('Events & Lifecycle', () => {
  test('global events log a visit from before to finish', async ({ page }) => {
    await page.goto('/features/events/global')
    await page.getByRole('button', { name: 'reload()' }).click()
    const log = page.locator('main ul')
    for (const name of ['before', 'start', 'success', 'finish']) await expect(log).toContainText(name)
  })

  test('visit callbacks fire in order, and a cancel token cancels', async ({ page }) => {
    await page.goto('/features/events/callbacks')
    await page.getByRole('button', { name: 'partial reload of this page' }).click()
    const log = page.locator('main ul')
    for (const name of ['onBefore', 'onStart', 'onSuccess', 'onFinish']) await expect(log).toContainText(name)

    await page.getByRole('button', { name: 'start, then cancel it via the cancel token' }).click()
    await expect(log).toContainText('onCancel')
  })

  test('the progress bar shows for a slow visit', async ({ page }) => {
    await page.goto('/features/events/progress')
    await page.getByRole('link', { name: '2 s visit: bar shows' }).click()
    await expect(page.locator('#nprogress')).toBeAttached({ timeout: 3_000 })
    await expect(page.getByRole('heading', { name: 'Slow page' })).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Error handling', () => {
  test('an HTTP error renders the configured error page with its status, as a visit and as a first load', async ({ page }) => {
    await page.goto('/features/errors/http')
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/features/errors/http/404')),
      page.getByRole('link', { name: /^404/ }).click(),
    ])
    expect(response.status()).toBe(404)
    await expect(page.getByRole('heading', { name: '404 · Not found' })).toBeVisible()
    await expect(page.locator('aside')).toBeVisible() // shared props: the sidebar is still there

    const direct = await page.goto('/features/errors/http/503')
    expect(direct?.status()).toBe(503)
    await expect(page.getByRole('heading', { name: '503 · Service unavailable' })).toBeVisible()
  })

  test('a network error is reported through onNetworkError, and a hanging request can be cancelled', async ({ page }) => {
    await page.goto('/features/errors/network')
    await page.getByRole('button', { name: 'visit an unreachable host' }).click()
    await expect(page.locator('main ul')).toContainText('onNetworkError')

    await page.getByRole('button', { name: 'visit a route that never answers, cancel after 3 s' }).click()
    await expect(page.locator('main ul')).toContainText('cancelled after 3 s', { timeout: 6_000 })
  })
})

test.describe('HTTP', () => {
  test('useHttp: a JSON typeahead and a POST with 422 errors', async ({ page }) => {
    await page.goto('/features/http/use-http')
    await page.getByPlaceholder('Type a city…').fill('am')
    await expect(page.getByRole('listitem').filter({ hasText: 'Amsterdam' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Berlin' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Send JSON' }).click()
    await expect(page.getByText('At least 2 characters.')).toBeVisible()
    await expect(page.getByText('Must be a positive number.')).toBeVisible()

    await page.getByLabel('Name').fill('Lee')
    await page.getByLabel('Amount (excl. VAT)').fill('100')
    await page.getByRole('button', { name: 'Send JSON' }).click()
    await expect(page.locator('pre')).toContainText('"total": 121')
  })
})

test.describe('Server-side rendering', () => {
  test('the @Ssr() route ships markup in the first response, its CSR twin does not', async ({ request }) => {
    const ssr = await (await request.get('/features/forms/validation')).text()
    expect(ssr).toContain('<h1')
    expect(ssr).toContain('Validation')
    const csr = await (await request.get('/features/forms/validation-csr')).text()
    expect(csr).not.toContain('<h1')
    expect(csr).toContain('data-page="app"')
  })
})
