import { expect as baseExpect, test, type Page } from '@playwright/test'
import { isSameDocument, markDocument } from './helpers'

// Every other spec starts logged in (auth.setup.ts); this one starts as a guest.
test.use({ storageState: { cookies: [], origins: [] } })

// Checking a password is slow on purpose (scrypt at OWASP's cost, ~0.6 s on a
// laptop, more on a busy CI runner), and some of these tests check several.
const expect = baseExpect.configure({ timeout: 15_000 })
test.slow()

/** Fills the login form on the current page and submits it. */
async function logIn(page: Page, email: string, password = 'password') {
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
}

test.describe('Auth: the NestJS docs’ guard, recognised by nestjs-mvc', () => {
  test('a guest opening a CRM page lands on the login page, and on that page after logging in', async ({ page }) => {
    await page.goto('/organizations')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('aside')).toContainText('Log in') // the sidebar knows nobody is logged in

    await logIn(page, 'user3@example.com')
    await expect(page).toHaveURL(/\/organizations$/)
    await expect(page.locator('aside')).toContainText('Nour Haddad')
  })

  test('a wrong password is an error on the email field; the sixth try is refused as too many', async ({ page }) => {
    const email = `nobody-${Date.now()}@example.com`
    await page.goto('/login')
    for (let attempt = 1; attempt <= 5; attempt++) {
      await logIn(page, email, 'wrong')
      await expect(page.getByText('These credentials do not match our records.')).toBeVisible()
      // The form clears the password when a submit finishes; wait for it, or
      // the next attempt's password is cleared after it was typed.
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('')
    }
    await logIn(page, email, 'wrong')
    await expect(page.getByText(/Too many login attempts\. Try again in \d+ seconds\./)).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(email)
  })

  test('registering creates an account and logs it in; the login page then sends you on', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('textbox', { name: 'Name' }).fill('Eddie Tester')
    await page.getByRole('textbox', { name: 'Email' }).fill(`eddie-${Date.now()}@example.com`)
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.getByLabel('Confirm password').fill('correct horsE')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('The passwords do not match.')).toBeVisible()

    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.getByLabel('Confirm password').fill('correct horse')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Welcome back, Eddie Tester. You have written 0 notes.')).toBeVisible()

    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('a switch of user in another tab reaches this one: the next visit does not show the first user’s data', async ({
    context,
  }) => {
    // Tab one: Robin Fox on the dashboard, holding the `you` once prop.
    const first = await context.newPage()
    await first.goto('/login')
    await logIn(first, 'user1@example.com')
    await expect(first.getByText(/Welcome back, Robin Fox\./)).toBeVisible()

    // Tab two, same browser: log out, log in as Sam Reed. Tabs share cookies,
    // not pages.
    const second = await context.newPage()
    await second.goto('/dashboard')
    await second.getByRole('button', { name: 'Log out' }).click()
    await expect(second).toHaveURL(/\/login$/)
    await logIn(second, 'user2@example.com')
    await expect(second.getByText(/Welcome back, Sam Reed\./)).toBeVisible()

    // Back in tab one, an ordinary visit to the dashboard. Its client still
    // holds Robin's `you` and would fill it in for Sam; the page's version
    // says it was rendered for Robin, so nestjs-mvc answers with a full load.
    await first.bringToFront()
    await markDocument(first)
    await first.locator('aside a[href="/dashboard"]').click()
    await expect(first.getByText(/Welcome back, Sam Reed\./)).toBeVisible()
    await expect(first.getByText(/Welcome back, Robin Fox/)).toHaveCount(0)
    expect(await isSameDocument(first)).toBe(false)
  })

  test('switching users in one tab resets the client: nothing the first user loaded survives', async ({ page }) => {
    await page.goto('/login')
    await logIn(page, 'user1@example.com')
    await expect(page.getByText(/Welcome back, Robin Fox\. You have written \d+ notes\./)).toBeVisible()
    await markDocument(page)

    // Log out from the sidebar: an Inertia POST and redirect. The page that
    // follows sees a different user than the client's last page (nobody), and
    // nestjs-mvc answers it with a full page load.
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('aside')).toContainText('Log in')
    expect(await isSameDocument(page), 'the logout ended in a full page load').toBe(false)
    await markDocument(page)

    // Log in as someone else, still in this tab. The dashboard's `you` is a
    // once prop the client would otherwise still hold from Robin Fox, and
    // fill in for Sam Reed.
    await logIn(page, 'user2@example.com')
    await expect(page.getByText(/Welcome back, Sam Reed\. You have written \d+ notes\./)).toBeVisible()
    await expect(page.getByText(/Welcome back, Robin Fox/)).toHaveCount(0)
    expect(await isSameDocument(page), 'the login ended in a full page load').toBe(false)
  })
})
