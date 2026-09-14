import { expect, test, type Page } from '@playwright/test'

/** Absolute, because the cross-site test posts from about:blank. */
const target = () => new URL('/features/state/flash/message', test.info().project.use.baseURL).href

/** Submits a plain HTML form (no JavaScript client, so no X-XSRF-TOKEN) and returns the answer's status. */
async function submitPlainForm(page: Page, action: string): Promise<number> {
  const answer = page.waitForResponse((res) => res.url() === action && res.request().method() === 'POST')
  await page.evaluate((url) => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = url
    document.body.append(form)
    form.submit()
  }, action)
  return (await answer).status()
}

test.describe('Content Security Policy', () => {
  test('every script on the page carries the nonce from the header, and an injected one does not run', async ({ page }) => {
    const response = await page.goto('/features/state/flash')
    const policy = response!.headers()['content-security-policy']
    const nonce = /'nonce-([^']+)'/.exec(policy)![1]
    expect(nonce).toBeTruthy()

    // The browser hides the attribute, so read the property.
    const nonces = await page.$$eval('script', (scripts) => scripts.map((script) => script.nonce))
    expect(nonces.length).toBeGreaterThan(1)
    expect(nonces.every((value) => value === nonce)).toBe(true)

    // Which is the point: a script the page did not render is refused.
    const injected = await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'window.__injected = true'
      document.head.append(script)
      return (window as unknown as { __injected?: boolean }).__injected === true
    })
    expect(injected).toBe(false)
  })
})

test.describe('CSRF', () => {
  test('a page carries a token the client echoes, so an Inertia POST goes through', async ({ page, context }) => {
    await page.goto('/features/state/flash')
    const cookie = (await context.cookies()).find((c) => c.name === 'XSRF-TOKEN')
    expect(cookie?.httpOnly).toBe(false)
    expect(cookie?.sameSite).toBe('Lax')

    const post = page.waitForRequest((req) => req.method() === 'POST')
    await page.getByRole('button', { name: 'POST → flash a message' }).click()
    expect((await post).headers()['x-xsrf-token']).toBe(decodeURIComponent(cookie!.value))
    await expect(page.getByText('A plain message, shown once.').first()).toBeVisible()
  })

  test('another site cannot make the browser submit a form to the app', async ({ page }) => {
    // A page that is not the app's, so its `form-action 'self'` does not apply:
    // this is what a form on someone else's site does. The browser says
    // Sec-Fetch-Site: cross-site, and the server refuses it.
    await page.goto('about:blank')
    expect(await submitPlainForm(page, target())).toBe(403)
  })

  test('a stale token sends the form back with "page expired", and the retry goes through', async ({ page }) => {
    await page.goto('/features/forms/use-form')
    // What a key rotation leaves in an open tab: a token the server no longer accepts. Faked on
    // exactly one request, because any other request would already hand the page a fresh token.
    let stale = true
    await page.route('**/features/forms/use-form/messages', (route) => {
      if (!stale) return route.continue()
      stale = false
      return route.continue({ headers: { ...route.request().headers(), 'x-xsrf-token': 'stale.token' } })
    })

    const name = page.getByRole('textbox', { name: 'Name' })
    const message = page.getByRole('textbox', { name: 'Message' })
    await name.fill('Lee')
    await message.fill('Hello')
    const expired = page.waitForResponse((res) => res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    expect((await expired).status()).toBe(302)
    await expect(page.getByText('This page has expired. Please try again.')).toBeVisible()
    // Back on the same page component: what the user typed is still there.
    await expect(name).toHaveValue('Lee')
    await expect(message).toHaveValue('Hello')

    const retried = page.waitForResponse((res) => res.request().method() === 'POST')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    expect((await retried).status()).toBe(302)
    await expect(page.getByText('Thanks, Lee.')).toBeVisible()
  })

  test('a form that does not echo the token is refused as expired, even from the app itself', async ({ page }) => {
    await page.goto('/features/state/flash')
    expect(await submitPlainForm(page, target())).toBe(419)
  })
})
