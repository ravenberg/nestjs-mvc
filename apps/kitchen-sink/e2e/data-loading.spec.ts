import { expect, test } from '@playwright/test'

const unique = () => Date.now().toString(36).slice(-6)

test.describe('Data Loading', () => {
  test('Deferred props: counters and the report arrive after the paint, the failing one is rescued', async ({ page }) => {
    await page.goto('/features/data-loading/deferred-props')
    await expect(page.getByText(/\d+ contacts · \d+ notes/)).toBeVisible()
    await expect(page.getByText(/\d+ favourites · generated/)).toBeVisible()
    await expect(page.getByText('Recommendations are unavailable right now.')).toBeVisible()
    await expect(page.locator('code', { hasText: '"recommendations"' })).toBeVisible()
  })

  test('Partial reloads: an optional prop is absent until asked for, and only that one resolves', async ({ page }) => {
    await page.goto('/features/data-loading/partial-reloads')
    const audit = page.locator('section', { has: page.getByRole('heading', { name: 'audit' }) })
    await expect(audit).toContainText('not loaded')

    await page.getByRole('button', { name: "only: ['contacts']" }).click()
    await expect(page.getByRole('button', { name: "only: ['contacts']" })).toBeEnabled()
    await expect(audit).toContainText('not loaded')

    await page.getByRole('button', { name: "only: ['audit'] (optional)" }).click()
    await expect(audit).toContainText(/\d+ entries/)
  })

  test('Infinite scroll: reaching the bottom appends the next page', async ({ page }) => {
    await page.goto('/features/data-loading/infinite-scroll?page=3')
    // Landing mid-way, the component first fills upwards (pages 2 and 1); wait for that to settle,
    // because those prepends keep the viewport in place and would push the bottom edge away again.
    await expect(page.getByText('Newest notes reached')).toBeVisible({ timeout: 10_000 })
    const notes = page.locator('main ul > li')
    const before = await notes.count()
    expect(before).toBeGreaterThan(15)

    const edge = page.getByText('Scroll down for older notes')
    await expect
      .poll(
        async () => {
          await edge.scrollIntoViewIfNeeded()
          return notes.count()
        },
        { timeout: 10_000 },
      )
      .toBeGreaterThan(before)
  })

  test('When Visible: a section loads when it scrolls into view', async ({ page }) => {
    await page.goto('/features/data-loading/when-visible')
    const archive = page.locator('section', { has: page.getByRole('heading', { name: /^archive/ }) })
    await archive.scrollIntoViewIfNeeded()
    await expect(archive).toContainText(/Loaded "archive" at/)
  })

  test('Polling: start, receive responses, stop', async ({ page }) => {
    await page.goto('/features/data-loading/polling')
    // usePoll starts on mount.
    await expect(page.getByText(/^polling ·/)).toBeVisible()
    await expect(page.getByText(/[1-9]\d* responses/)).toBeVisible({ timeout: 8_000 })
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.getByText(/^stopped ·/)).toBeVisible()
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByText(/^polling ·/)).toBeVisible()
  })

  test('Prop merging: append, prepend, match on id, and reset', async ({ page }) => {
    await page.goto('/features/data-loading/prop-merging')
    const card = (title: string) => page.locator('section', { has: page.getByRole('heading', { name: title }) })
    const appended = card('Appended').getByRole('listitem')
    const prepended = card('Prepended').getByRole('listitem')
    const matched = card('Matched on id').getByRole('listitem')
    // Each button is one partial reload; wait for that exact response before looking at the DOM.
    const reload = async (button: ReturnType<typeof page.getByRole>, tick: number, reset = false) =>
      Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes(`tick=${tick}`) &&
            r.request().headers()['x-inertia'] === 'true' &&
            (r.request().headers()['x-inertia-reset'] !== undefined) === reset,
        ),
        button.click(),
      ])

    await expect(appended.first()).toBeVisible()
    const counts = { appended: await appended.count(), prepended: await prepended.count(), matched: await matched.count() }
    const firstPrepended = await prepended.first().innerText()
    const firstMatched = await matched.first().innerText()

    await reload(card('Appended').getByRole('button', { name: 'append one' }), 1)
    await expect(appended).toHaveCount(counts.appended + 1)

    await reload(card('Prepended').getByRole('button', { name: 'prepend one' }), 2)
    await expect(prepended).toHaveCount(counts.prepended + 1)
    await expect(prepended.first()).not.toHaveText(firstPrepended)

    // Every send carries id 1 again (updated in place, never duplicated) plus one new id.
    await reload(card('Matched on id').getByRole('button', { name: 'send again' }), 3)
    await expect(matched.first()).not.toHaveText(firstMatched)
    await expect(matched).toHaveCount(counts.matched + 1)
    await expect(matched.filter({ hasText: /^#1\b/ })).toHaveCount(1)

    await reload(page.getByRole('button', { name: 'Reset' }), 0, true)
    await expect(appended).toHaveCount(counts.appended)
    await expect(prepended).toHaveCount(counts.prepended)
  })

  test('Once props: the once prop keeps its stamp across visits, a mutation refreshes it', async ({ page }) => {
    await page.goto('/features/data-loading/once-props')
    const onceStamp = page.locator('section', { has: page.getByRole('heading', { name: 'Once prop', exact: true }) }).locator('p').first()
    const stamp = await onceStamp.innerText()

    // Wait for the visit to land: the component remounts, so typing before that would be lost.
    await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/once-props') && r.request().headers()['x-inertia'] === 'true'),
      page.getByRole('link', { name: 'Visit again' }).click(),
    ])
    await expect(onceStamp).toHaveText(stamp)

    const name = `Initech ${unique()}`
    await page.getByPlaceholder('Initech').fill(name)
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText(`Added “${name}”. The dropdown was refreshed.`)).toBeVisible()
    await expect(page.locator('select option', { hasText: name })).toHaveCount(1)
  })
})
