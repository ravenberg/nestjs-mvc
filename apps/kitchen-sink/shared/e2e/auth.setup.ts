import { expect, test as setup } from '@playwright/test'

/**
 * The CRM pages need a login since `auth-recipes`: log in once, through the
 * real form, and let every spec start from that browser state.
 */
setup('log in as the test user', async ({ page }, testInfo) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('password')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Welcome back, Test User.')).toBeVisible()
  // Where every other spec starts from (per app, gitignored); see config.ts.
  await page.context().storageState({ path: testInfo.config.metadata.storageState as string })
})
