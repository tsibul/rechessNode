import { test, expect } from '@playwright/test'

/** Footer links open a pop-up over the current page; the documents themselves stay ordinary pages. */
test('footer links open a pop-up that closes with Esc, the cross and a click outside', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/about')
  const dialog = page.getByTestId('info-dialog')
  await expect(dialog).toHaveCount(0)

  // Privacy policy: the right document (not the company details or the cookie policy), the page behind stays.
  await page.getByTestId('footer-privacy').click()
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/\/about$/)
  await expect(dialog).toContainText('Редакция от')
  await expect(dialog).not.toContainText('ИНН')
  await expect(dialog.getByRole('dialog')).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

  // Company details; closed by the cross.
  await page.getByTestId('footer-company').click()
  await expect(dialog).toContainText('ИНН')
  await expect(dialog).not.toContainText('Редакция от')
  await page.getByTestId('info-dialog-close').click()
  await expect(dialog).toHaveCount(0)

  // Closed by a click on the dark area outside the panel.
  // On a phone the panel is a full-screen sheet (<= 660px), so there is no outside area to click.
  if (page.viewportSize()!.width > 660) {
    await page.getByTestId('footer-company').click()
    await expect(dialog).toBeVisible()
    await dialog.click({ position: { x: 3, y: 3 } })
    await expect(dialog).toHaveCount(0)
  }

  // The panel fits the screen and scrolls inside, the page does not get a horizontal scroll.
  await page.getByTestId('footer-privacy').click()
  const box = await dialog.getByRole('dialog').boundingBox()
  const view = page.viewportSize()!
  expect(box!.width).toBeLessThanOrEqual(view.width)
  expect(box!.height).toBeLessThanOrEqual(view.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('the document pages are still reachable and the links keep their addresses', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByTestId('footer-privacy')).toHaveAttribute('href', '/privacy')
  await expect(page.getByTestId('footer-company')).toHaveAttribute('href', '/privacy#company')
  await page.goto('/privacy#company')
  await expect(page.getByTestId('columns')).toBeVisible()
  await expect(page.getByTestId('columns')).toContainText('ИНН')
  await expect(page.getByTestId('info-dialog')).toHaveCount(0)
})

test('each colour pair is a three-slide carousel with one next arrow', async ({ page }) => {
  await page.goto('/colors')
  const cards = page.locator('.card')
  await expect(cards).toHaveCount(7)
  for (let i = 0; i < 7; i++) await expect(cards.nth(i).locator('.card__slide')).toHaveCount(3)
  await expect(page.getByTestId('pair-next')).toHaveCount(7)
})
