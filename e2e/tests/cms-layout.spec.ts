import { test, expect } from '@playwright/test'
import { login } from '../support/cms'

const SIZES = [
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 }
]

for (const size of SIZES) {
  test(`CMS fits the ${size.name} (${size.width}px): every section, forms, no page-wide horizontal scroll`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: size.width, height: size.height })
    await login(page, 'admin')
    const links = page.locator('.cms-nav__link')
    const count = await links.count()
    expect(count).toBeGreaterThan(15)
    const problems: string[] = []
    for (let i = 0; i < count; i++) {
      const link = links.nth(i)
      const title = (await link.innerText()).trim()
      await link.click()
      await page.waitForLoadState('networkidle')
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      if (over > 0) problems.push(`${title}: page overflows by ${over}px`)

      // Table sections: open the "new record" form; the form must fit and its save button be reachable.
      const add = page.locator('main').getByRole('button', { name: 'Добавить' }).first()
      if (title !== 'Настройки' && (await add.count())) {
        await add.click()
        const box = page.locator('.cms-modal__box')
        if (await box.count()) {
          const r = await box.boundingBox()
          if (!r || r.x < -1 || r.x + r.width > size.width + 1) problems.push(`${title}: form is wider than the screen (${JSON.stringify(r)})`)
          const save = box.getByRole('button', { name: 'Сохранить' })
          if (await save.count()) {
            await save.scrollIntoViewIfNeeded()
            const b = await save.boundingBox()
            if (!b || b.x < 0 || b.x + b.width > size.width) problems.push(`${title}: save button is off-screen`)
          }
          await box.getByRole('button', { name: 'Закрыть' }).click()
        }
      }
    }
    expect(problems, problems.join('\n')).toEqual([])
    // The side menu and the exit button stay reachable.
    await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
  })
}

test('order card is usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'manager')
  await page.locator('.cms-nav__link', { hasText: 'Заказы' }).click()
  const row = page.locator('tbody tr').first()
  if (!(await row.count())) test.skip(true, 'no orders')
  await row.click()
  const box = page.locator('.cms-modal__box')
  const r = await box.boundingBox()
  expect(r!.x).toBeGreaterThanOrEqual(-1)
  expect(r!.x + r!.width).toBeLessThanOrEqual(391)
  await page.screenshot({ path: 'test-results/order-card-phone.png' })
})
