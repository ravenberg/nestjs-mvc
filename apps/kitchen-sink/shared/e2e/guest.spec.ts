import { expect as baseExpect, test } from '@playwright/test'
import { watchErrors } from './helpers'

// Every other spec starts logged in (auth.setup.ts); this one is the visitor.
test.use({ storageState: { cookies: [], origins: [] } })
const expect = baseExpect.configure({ timeout: 15_000 })

test.describe('A visitor who is not logged in', () => {
  for (const href of ['/login', '/register', '/forgot-password']) {
    test(`${href} renders on a first load without errors`, async ({ page }) => {
      const errors = watchErrors(page)
      const response = await page.goto(href)
      expect(response?.status(), `${href} answers 200`).toBe(200)
      await expect(page.locator('h1').first()).not.toBeEmpty()
      errors.expectClean()
    })
  }

  test('can open every feature page, but not the CRM', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/features/state/flash')
    await expect(page).toHaveURL(/\/features\/state\/flash$/)
    await expect(page.locator('aside')).toContainText('Log in') // the sidebar knows

    await page.getByRole('link', { name: 'Shared Props' }).click()
    await expect(page.getByText('none')).toBeVisible() // auth.user is null for a visitor

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
    errors.expectClean()
  })

  test('gets the 401 itself when it asks for data rather than a page', async ({ page }) => {
    const json = await page.request.get('/dashboard', { headers: { Accept: 'application/json' } })
    expect(json.status()).toBe(401)

    const xhr = await page.request.get('/dashboard', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    expect(xhr.status()).toBe(401)
  })

  test('stays logged in after the browser closes only when it asked to be remembered', async ({ page, context }) => {
    test.slow() // registering and logging in both hash a password
    // Its own account: logging in as a seeded user over and over runs into the
    // login throttle when the suite is run twice within a minute.
    const email = `remembered-${Date.now()}@example.com`
    await page.goto('/register')
    await page.getByRole('textbox', { name: 'Name' }).fill('Remembered Tester')
    await page.getByRole('textbox', { name: 'Email' }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill('a good password')
    await page.getByLabel('Confirm password').fill('a good password')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Welcome back, Remembered Tester.')).toBeVisible()

    const token = async () => (await context.cookies()).find((cookie) => cookie.name === 'access_token')
    // Registering signs you in for this browser session: `expires` is -1, so
    // the cookie goes when the browser does.
    expect((await token())!.expires).toBe(-1)

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await token()).toBeUndefined()

    await page.getByRole('textbox', { name: 'Email' }).fill(email)
    await page.getByRole('textbox', { name: 'Password' }).fill('a good password')
    await page.getByRole('checkbox', { name: 'Remember me' }).check()
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByText('Welcome back, Remembered Tester.')).toBeVisible()

    const remembered = (await token())!
    expect(remembered.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 24 * 3600)
    expect(remembered.httpOnly).toBe(true)
  })
})
