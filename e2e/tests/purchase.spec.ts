import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readState, TMP } from '../support/state'

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
  await banner.getByRole('button').click()
  await expect(banner).toBeHidden()

  await page.getByRole('button', { name: /добавить/ }).nth(1).click()
  await expect(page.getByRole('button', { name: /добавить \(1\)/ })).toBeVisible()
  await expect(page.getByTestId('cart-badge')).toContainText('(1)')

  await page.getByTestId('cart-badge').click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
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

  // Payment stub: the page says that no money is charged. First decline, repeat, then pay.
  await expect(page).toHaveURL(/\/order\/\d+\/pay$/)
  await expect(page.getByTestId('pay-stub-note')).toContainText('деньги не списываются')
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
  expect(mails.some((m) => m.includes(email))).toBeTruthy()
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
