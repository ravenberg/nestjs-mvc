import { expect, test } from '@playwright/test'
import { watchErrors } from './helpers'

const unique = () => Date.now().toString(36).slice(-6)

/** A 1×1 PNG, enough for the image upload route. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Forms', () => {
  test('Validation: a short message comes back as an error, a valid one is listed', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/features/forms/validation')
    await page.getByPlaceholder('Type something…').fill('ab')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('A message needs at least 3 characters.')).toBeVisible()

    const message = `hello ${unique()}`
    await page.getByPlaceholder('Type something…').fill(message)
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: message })).toBeVisible()
    await expect(page.getByText('A message needs at least 3 characters.')).toHaveCount(0)
    await expect(page.getByPlaceholder('Type something…')).toHaveValue('')
    errors.expectClean()
  })

  test('useForm: field errors, then a flash and the new message', async ({ page }) => {
    await page.goto('/features/forms/use-form')
    const form = page.locator('form').first()
    await form.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Who is writing? At least 2 characters.')).toBeVisible()
    await expect(page.getByText('Say a little more: at least 5 characters.')).toBeVisible()
    await expect(page.getByText('hasErrors: true')).toBeVisible()

    const author = `Ada ${unique()}`
    await form.getByLabel('Name').fill(author)
    await form.getByLabel('Message').fill('A message long enough to pass.')
    await form.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(`Thanks, ${author}.`)).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: author })).toBeVisible()
    await expect(page.getByText('hasErrors: false')).toBeVisible()
  })

  test('useForm: all messages per field through an error bag', async ({ page }) => {
    await page.goto('/features/forms/use-form')
    const password = page.getByPlaceholder('Try: password')
    await password.fill('password')
    await page.getByRole('button', { name: 'Check' }).click()
    const list = password.locator('xpath=..').getByRole('listitem')
    await expect(list).toHaveText([
      'At least 12 characters.',
      'At least one digit.',
      'At least one capital letter.',
      'Not the word "password".',
    ])
    // Scoped under its own bag: the message form above is untouched.
    await expect(page.getByText('hasErrors: false')).toBeVisible()

    await password.fill('Correct-Horse-9')
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(page.getByText('That password passes every rule.')).toBeVisible()
    await expect(list).toHaveCount(0)
  })

  test('<Form>: uncontrolled inputs, errors as render props, reset on success', async ({ page }) => {
    await page.goto('/features/forms/form-component')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    for (const text of [
      'A name of at least 2 characters.',
      'That is not an email address.',
      'Pick one of the plans.',
      'You have to accept the terms.',
    ]) {
      await expect(page.getByText(text)).toBeVisible()
    }

    const name = `Grace ${unique()}`
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(`grace-${unique()}@example.com`)
    await page.getByLabel('team').check()
    await page.getByLabel('I accept the terms').check()
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible()
    await expect(page.getByText('wasSuccessful true')).toBeVisible()
    await expect(page.getByLabel('Name')).toHaveValue('')
  })

  test('File uploads: preview, multipart POST, and the image served back', async ({ page }) => {
    await page.goto('/features/forms/file-uploads')
    await page.locator('input[type=file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Preview, not uploaded yet')).toBeVisible()

    const caption = `pixel ${unique()}`
    await page.getByLabel('Caption').fill(caption)
    await page.getByRole('button', { name: 'Upload' }).click()

    const image = page.locator(`img[alt="${caption}"]`)
    await expect(image).toBeVisible()
    const src = await image.getAttribute('src')
    const served = await page.request.get(src!)
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toContain('image/png')
  })

  test('Precognition: a taken email is reported on blur, before any submit', async ({ page }) => {
    await page.goto('/features/forms/precognition')
    const registered = page.locator('section', { has: page.getByRole('heading', { name: 'Registered' }) }).getByRole('listitem')
    await expect(registered.first()).toBeVisible()
    const before = await registered.count()

    await page.getByLabel('Email').fill('ada@example.com')
    await page.getByLabel('Email').press('Tab')
    await expect(page.getByText('That email is already registered.')).toBeVisible()
    expect(await registered.count(), 'no registration happened').toBe(before)

    const name = `Linus ${unique()}`
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(`linus-${unique()}@example.com`)
    await page.getByLabel('Password').fill('long-enough-password')
    await page.getByRole('button', { name: 'Register' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible()
  })

  test('Optimistic updates: shown at once, rolled back when the server rejects', async ({ page }) => {
    await page.goto('/features/forms/optimistic-updates')
    const title = `Milk ${unique()}`
    await page.getByPlaceholder('New todo…').fill(title)
    await page.getByRole('button', { name: 'Add' }).click()
    const todo = page.getByRole('listitem').filter({ hasText: title })
    await expect(todo).toBeVisible()
    await expect(todo).toContainText('saving…')
    await expect(todo).not.toContainText('saving…', { timeout: 5_000 })

    // The optimistic copy shows for the 1.2 s the server takes, then is rolled back with the error.
    await page.getByPlaceholder('New todo…').fill('fail')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('The server rejected this one on purpose.')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'fail' })).toHaveCount(0)
  })

  test('Dotted keys: nested errors live on blur and all at once on submit', async ({ page }) => {
    await page.goto('/features/forms/dotted-keys')
    await page.getByLabel('Email').fill('nope')
    await page.getByLabel('Email').press('Tab')
    await expect(page.getByText('That does not look like an email address.')).toBeVisible()

    await page.getByRole('button', { name: 'Save contact' }).click()
    await expect(page.getByText('Give the contact a name of at least 2 characters.')).toBeVisible()
    await expect(page.getByText('Which city?')).toBeVisible()
    await expect(page.getByText('Empty tag.')).toHaveCount(2)

    const name = `Margaret ${unique()}`
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill('margaret@example.com')
    await page.getByLabel('City').fill('Utrecht')
    await page.getByLabel('Postcode').fill('3511 AB')
    await page.getByLabel('Tag 1').fill('nasa')
    await page.getByLabel('Tag 2').fill('apollo')
    await page.getByRole('button', { name: 'Save contact' }).click()
    await expect(page.getByText(`Saved ${name}.`)).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('nasa, apollo')
  })
})
