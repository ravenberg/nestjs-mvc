import { expect as baseExpect, test, type Page } from '@playwright/test'

// Registering and resetting hash passwords, which is slow on purpose.
test.use({ storageState: { cookies: [], origins: [] } })
const expect = baseExpect.configure({ timeout: 15_000 })
test.slow()

/** Registers a fresh account and returns its address. */
async function register(page: Page, password = 'first-password'): Promise<string> {
  const email = `linked-${Date.now()}@example.com`
  await page.goto('/register')
  await page.getByRole('textbox', { name: 'Name' }).fill('Linked Tester')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Welcome back, Linked Tester.')).toBeVisible()
  return email
}

test.describe('Signed links', () => {
  test('a new account verifies its email address through the link it was sent', async ({ page }) => {
    await register(page)
    await expect(page.getByText('Your email address is not verified yet.')).toBeVisible()

    // The demo shows the link a real app would email.
    await page.getByRole('link', { name: /\/verify-email\// }).click()
    await expect(page.getByRole('status')).toHaveText('Your email address is verified.')
    await expect(page.getByText('Your email address is not verified yet.')).toBeHidden()

    await page.goto('/dashboard')
    await expect(page.getByText('Your email address is not verified yet.')).toBeHidden()
  })

  test('an account that lost its link can ask for a new one', async ({ page }) => {
    await register(page)
    await page.getByRole('button', { name: 'Send a new link' }).click()
    await expect(page.getByRole('status')).toHaveText('A new verification link is on its way.')

    await page.getByRole('link', { name: /\/verify-email\// }).click()
    await expect(page.getByRole('status')).toHaveText('Your email address is verified.')
    await expect(page.getByText('Your email address is not verified yet.')).toBeHidden()
  })

  test('a reset link sets a new password, and stops working once it has been used', async ({ page }) => {
    const email = await register(page)
    // Logging out ends in a full page load (the client reset); let it land.
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/forgot-password')
    await page.getByRole('textbox', { name: 'Email' }).fill(email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByRole('status')).toHaveText('If we know that address, a reset link is on its way.')

    const link = page.getByRole('link', { name: /\/reset-password\// })
    const url = (await link.getAttribute('href'))!
    await link.click()
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()

    await page.getByLabel('New password', { exact: true }).fill('second-password')
    await page.getByLabel('Confirm password').fill('second-password')
    await page.getByRole('button', { name: 'Save password' }).click()
    await expect(page.getByRole('status')).toHaveText('Your password was changed.')
    await expect(page.locator('aside')).toContainText('Linked Tester') // and logged in

    // The link was bound to the password it replaced, so it is spent.
    await page.goto(url)
    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole('status')).toHaveText('That reset link is no longer valid. Ask for a new one.')

    // The new password is the one that works now. (The reset logged us in, and
    // the login page sends a logged-in visitor on, so log out first.)
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByRole('textbox', { name: 'Email' }).fill(email)
    await page.getByRole('textbox', { name: 'Password' }).fill('first-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByText('These credentials do not match our records.')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue('') // the form clears it when the submit finishes

    await page.getByRole('textbox', { name: 'Password' }).fill('second-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByText('Welcome back, Linked Tester.')).toBeVisible()
  })

  test('a link that was tampered with is refused', async ({ page }) => {
    await register(page)
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/forgot-password')
    await page.getByRole('textbox', { name: 'Email' }).fill('user1@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()

    const url = (await page.getByRole('link', { name: /\/reset-password\// }).getAttribute('href'))!
    await page.goto(url.replace(/\/reset-password\/\d+/, '/reset-password/1'))
    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole('status')).toHaveText('That reset link is no longer valid. Ask for a new one.')
  })
})
