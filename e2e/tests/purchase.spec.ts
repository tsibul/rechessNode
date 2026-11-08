import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readState, TMP } from '../support/state'

/** Link from the confirmation mail of the address (the mail is a file in the outbox). */
async function confirmLink(email: string): Promise<string> {
  const outbox = path.join(TMP, 'outbox')
  let link = ''
  await expect.poll(() => {
    if (!fs.existsSync(outbox)) return ''
    for (const f of fs.readdirSync(outbox).sort().reverse()) {
      const raw = fs.readFileSync(path.join(outbox, f), 'utf8').replace(/=\r?\n/g, '').replace(/=3D/gi, '=')
      if (!raw.includes(email)) continue
      const m = raw.match(/\/order\/confirm\/([A-Za-z0-9_-]{20,100})/)
      if (m) { link = `/order/confirm/${m[1]}`; return link }
    }
    return ''
  }).not.toBe('')
  return link
}

/** Whole purchase without payment: product -> cart -> order form -> confirmation -> mail in the outbox. */
test('buyer buys a pair of colours and gets the confirmation', async ({ page }) => {
  const { tag } = readState()
  const email = `e2e-${tag}-${test.info().project.name}@example.com`
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/shop')
  await expect(page.getByTestId('product')).toBeVisible()
  expect(await page.getByTestId('price').innerText()).toMatch(/\d/)

  // Pairs of colours are bought on /colors. The cookie banner covers a phone screen: the buyer closes it first.
  await page.goto('/colors')
  const banner = page.getByTestId('cookie-consent')
  await expect(banner).toBeVisible()
  await banner.getByTestId('cookie-accept').click()
  await expect(banner).toBeHidden()

  await page.getByRole('button', { name: /добавить/ }).nth(1).click()
  await expect(page.getByTestId('pair-in-cart')).toHaveText('в корзине: 1')
  await expect(page.getByTestId('cart-badge')).toContainText('(1)')

  await page.getByTestId('cart-badge').click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  // The line shows the product name (from the product data) and the photo of the chosen pair.
  await expect(page.getByTestId('cart-product')).toContainText(/ReChess/i)
  const thumb = page.getByTestId('cart-line').locator('img')
  await expect(thumb).toBeVisible()
  await expect.poll(() => thumb.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)
  await page.getByRole('button', { name: 'Больше' }).click()
  await expect(page.getByTestId('cart-badge')).toContainText('(2)')

  // The cart survives a reload (it is kept on the server).
  await page.reload()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('cart-badge')).toContainText('(2)')

  await page.getByTestId('to-order').click()
  await expect(page).toHaveURL(/\/order$/)

  // Without the consent the order is not sent: the field shows an error.
  await page.locator('input[name="name"]').fill('Иван')
  await page.locator('input[name="family_name"]').fill('Тестов')
  await page.locator('input[name="phone"]').fill('+7 999 000-00-01')
  await page.locator('input[name="e_mail"]').fill(email)
  await page.locator('input[name="city"]').fill('Москва')
  await page.locator('input[name="delivery_address"]').fill('Москва, ул. Тестовая, 1')
  await page.getByTestId('submit').click()
  await expect(page.getByText('Нужно согласие на обработку данных')).toBeVisible()
  await expect(page).toHaveURL(/\/order$/)
  await expect(page.getByTestId('order-total')).toContainText('Доставка')
  await page.locator('input[name="consent"]').check()
  await page.getByTestId('submit').click()

  // Until the e-mail is confirmed there is no payment: the order page asks for the link from the mail.
  await expect(page).toHaveURL(/\/order\/\d+$/)
  await expect(page.getByTestId('order-confirm-pending')).toContainText(email)
  await expect(page.getByTestId('order-pay-link')).toHaveCount(0)
  // Another mail right away is refused: a pause between the mails.
  await page.getByTestId('confirm-resend').click()
  await expect(page.getByTestId('confirm-notice')).toBeVisible()
  const link = await confirmLink(email)
  // The link opens in a fresh browser (another mail client): the page confirms, it needs no cookie.
  const other = await page.context().browser()!.newContext({ baseURL: test.info().project.use.baseURL })
  const p2 = await other.newPage()
  await p2.goto(link)
  await expect(p2.getByTestId('confirm-ok')).toBeVisible()
  await p2.reload()
  await expect(p2.getByTestId('confirm-ok')).toBeVisible()
  await other.close()

  // Payment stub appears on the order page without a reload (the page polls).
  await expect(page.getByTestId('order-pay-link')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('order-pay-link').click()
  await expect(page).toHaveURL(/\/order\/\d+\/pay$/)
  await expect(page.getByTestId('pay-stub-note')).toContainText('свяжемся')
  await expect(page.getByTestId('pay-stub-note')).toContainText('Нажмите «Оплатить»')
  await expect(page.getByTestId('pay-ok')).toHaveText('Оплатить')
  await expect(page.getByTestId('pay-amount')).toContainText('₽')
  await page.getByTestId('pay-fail').click()
  await expect(page.getByTestId('pay-declined')).toBeVisible()
  await page.getByTestId('pay-retry').click()
  await page.getByTestId('pay-ok').click()

  await expect(page).toHaveURL(/\/order\/\d+$/)
  await expect(page.getByTestId('order-paid')).toBeVisible()
  const done = page.getByTestId('order-done')
  await expect(done).toContainText('оформлен')
  await expect(done).toContainText(email)
  await expect(done).toContainText('Итого')
  const number = page.url().match(/\/order\/(\d+)$/)![1]

  // The cart is empty again.
  await page.goto('/cart')
  await expect(page.getByTestId('cart-empty')).toBeVisible()

  // The confirmation mail is in the outbox (no SMTP in tests).
  const outbox = path.join(TMP, 'outbox')
  await expect.poll(() => (fs.existsSync(outbox) ? fs.readdirSync(outbox).length : 0)).toBeGreaterThan(0)
  const mails = fs.readdirSync(outbox).map((f) => fs.readFileSync(path.join(outbox, f), 'utf8'))
  const mail = mails.find((m) => m.includes(email) && m.includes('multipart/related'))!
  expect(mail).toBeTruthy()
  // The photo travels inside the mail (inline part, cid), not as a link to the site.
  expect(mail).toMatch(/Content-Type: multipart\/related/)
  expect(mail).toMatch(/Content-ID: <item-\d+@rechess>/)
  expect(errors).toEqual([])
  expect(number).toMatch(/^\d+$/)
})

test('order page of a stranger order is not found', async ({ page }) => {
  await page.goto('/order/999999999')
  await expect(page.getByTestId('order-missing')).toBeVisible()
})

test('empty cart and form validation', async ({ page }) => {
  await page.goto('/cart')
  await expect(page.getByTestId('cart-empty')).toBeVisible()
  await page.goto('/order')
  await expect(page.getByTestId('order-empty')).toBeVisible()
  await expect(page.getByTestId('order-form')).toHaveCount(0)
})

test('after a refusal of the analytics the order is placed as usual', async ({ page }) => {
  const { tag } = readState()
  const email = `e2e-${tag}-${test.info().project.name}-cookies@example.com`

  await page.goto('/colors')
  const banner = page.getByTestId('cookie-consent')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('можно отказаться')
  await banner.getByTestId('cookie-decline').click()
  await expect(banner).toBeHidden()
  // The refusal is remembered: the banner does not come back after a reload.
  await page.reload()
  await expect(page.getByTestId('cookie-consent')).toHaveCount(0)
  expect((await page.context().cookies()).find((c) => c.name === 'cookieConsent')?.value).toBe('declined')

  await page.getByRole('button', { name: /добавить/ }).nth(2).click()
  await expect(page.getByTestId('pair-in-cart')).toHaveText('в корзине: 1')
  await page.goto('/order')
  await page.locator('input[name="name"]').fill('Иван')
  await page.locator('input[name="family_name"]').fill('Тестов')
  await page.locator('input[name="phone"]').fill('+7 999 000-00-02')
  await page.locator('input[name="e_mail"]').fill(email)
  await page.locator('input[name="city"]').fill('Москва')
  await page.locator('input[name="delivery_address"]').fill('Москва, ул. Тестовая, 2')
  await page.locator('input[name="consent"]').check()
  await page.getByTestId('submit').click()
  await expect(page).toHaveURL(/\/order\/\d+$/)
  await expect(page.getByTestId('order-confirm-pending')).toBeVisible()
  await expect(page.getByTestId('cookie-consent')).toHaveCount(0)
})
