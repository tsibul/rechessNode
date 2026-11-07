import { test, expect } from '@playwright/test'
import { login, PNG, publishAndWait } from '../support/cms'
import { connect } from '../support/db'
import { readState } from '../support/state'

const publish = (page: import('@playwright/test').Page) => publishAndWait(page)

test('uploaded photo is served as AVIF/WebP in a real browser', async ({ page, browser }) => {
  test.setTimeout(240_000)
  await login(page, 'senior')
  await page.locator('.cms-nav__link', { hasText: 'Фото главной' }).click()
  const name = `e2e-photo-${readState().tag}`
  await page.getByRole('button', { name: 'Добавить' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Название').fill(name)
  await dialog.locator('input[type=file]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG })
  await expect(dialog.locator('img.cms-photo__img')).toBeVisible()
  await dialog.getByRole('button', { name: 'Сохранить' }).click()
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  await expect(page.locator('tbody tr', { hasText: name })).toBeVisible()
  await publish(page)

  const ctx = await browser.newContext()
  const site = await ctx.newPage()
  const loaded: string[] = []
  site.on('response', (r) => { if (/\/uploads\/[0-9a-f]{32}\.(avif|webp|png)$/.test(r.url())) loaded.push(r.url() + ' ' + r.status()) })
  await site.goto('/')
  await site.waitForLoadState('networkidle')
  const pic = site.locator('picture:has(source[type="image/avif"])').first()
  await expect(pic).toHaveCount(1)
  await expect(pic.locator('source[type="image/webp"]')).toHaveCount(1)
  const current = await pic.locator('img').evaluate((i: HTMLImageElement) => i.currentSrc)
  expect(current).toMatch(/\.avif$/) // Chrome picks the first supported source
  expect(loaded.some((l) => /\.avif 200$/.test(l)), loaded.join('\n')).toBeTruthy()
  await ctx.close()
})

test('counters start only after consent in the cookie banner', async ({ page, browser }) => {
  test.setTimeout(240_000)
  const db = connect()
  try {
    for (const [code, value] of [['counter.metrika', '12345678'], ['counter.vk', '3456789']]) {
      const n = await db('setting').where({ code }).update({ value })
      expect(n, `setting ${code} exists`).toBe(1)
    }
  } finally { await db.destroy() }
  await login(page, 'senior')
  await publish(page)

  const ctx = await browser.newContext()
  const site = await ctx.newPage()
  const external: string[] = []
  // No real traffic to the counters: record the requests, answer with an empty script.
  await site.route(/^https?:\/\/(mc\.yandex\.ru|vk\.com|top-fwz1\.mail\.ru|ad\.mail\.ru)\//, (route) => {
    external.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  })
  await site.goto('/shop')
  await site.waitForLoadState('networkidle')
  await expect(site.getByTestId('cookie-consent')).toBeVisible()
  expect(external, 'before consent').toEqual([])
  await site.getByTestId('cookie-accept').click()
  await expect.poll(() => external.length).toBeGreaterThan(0)
  expect(external.some((u) => u.includes('mc.yandex.ru/metrika/tag.js'))).toBeTruthy()

  // A returning visitor with the consent cookie starts them on load.
  external.length = 0
  await site.reload()
  await expect.poll(() => external.length).toBeGreaterThan(0)
  await ctx.close()
})
