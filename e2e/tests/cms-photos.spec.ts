import { test, expect, type Page } from '@playwright/test'
import { login, PNG } from '../support/cms'
import { readState } from '../support/state'

async function publish(page: Page) {
  await page.locator('.cms-nav__link', { hasText: 'Публикация' }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Опубликовать' }).click()
  await expect.poll(async () => {
    const r = await (await page.request.get('/api/cms/publications?limit=1')).json()
    const p = r.publications[0]
    return p ? `${p.state}${p.state === 'failed' ? ': ' + p.log : ''}` : 'none'
  }, { timeout: 150_000, intervals: [1000] }).toBe('done')
}

async function uploadPhoto(page: Page): Promise<string> {
  const res = await page.request.post('/api/cms/uploads', { multipart: { file: { name: 'dot.png', mimeType: 'image/png', buffer: PNG } } })
  expect(res.status()).toBe(201)
  return (await res.json()).photo
}

test('manager reorders home photos with arrows and removes one', async ({ page }) => {
  await login(page, 'senior')
  const tag = readState().tag
  const names = [`e2e-order-a-${tag}`, `e2e-order-b-${tag}`]
  for (const [i, name] of names.entries()) {
    const res = await page.request.post('/api/cms/tables/index_photo', { data: { name, priority: i + 1, photo: await uploadPhoto(page) } })
    expect(res.status()).toBe(201)
  }
  await page.locator('.cms-nav__link', { hasText: 'Фото главной' }).click()
  const rows = page.locator('tbody tr', { hasText: 'e2e-order-' })
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('order-a')
  const rowB = page.locator('tbody tr', { hasText: names[1] })
  await rowB.getByRole('button', { name: 'Выше' }).click()
  await expect.poll(async () => {
    const r = await (await page.request.get('/api/index-photos')).json()
    return r.photos.map((p: any) => p.name).filter((n: string) => n.startsWith('e2e-order-'))
  }).toEqual([names[1], names[0]])
  for (const name of names) {
    page.once('dialog', (d) => d.accept())
    await page.locator('tbody tr', { hasText: name }).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(0)
  }
})

test('manager adds a pair with three slides; after publication it is a three-slide card on /colors', async ({ page, browser }) => {
  test.setTimeout(300_000)
  await login(page, 'senior')
  const tag = readState().tag
  const newColor = async (n: number) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const code = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`
      const res = await page.request.post('/api/cms/tables/color', { data: { name: `e2e-color-${n}-${tag}`, code, hex: n === 1 ? 'aa0000' : '0000aa' } })
      if (res.status() === 201) return (await res.json()).row.id as number
    }
    throw new Error('no free colour code')
  }
  const c1 = await newColor(1)
  const c2 = await newColor(2)
  const products = (await (await page.request.get('/api/products')).json()).products as Array<{ id: number; price: number | null; items: unknown[] }>
  const product = products.find((p) => p.price !== null && p.items.length)!
  const before = product.items.length
  const pair = await (await page.request.post('/api/cms/tables/item', {
    data: { name: `e2e-pair-${tag}`, product_id: product.id, main_color: c1, second_color: c2 }
  })).json()
  expect(pair.row, JSON.stringify(pair)).toBeTruthy()
  const id = pair.row.id as number

  // one slide through the form, to prove the manager can choose the slot
  await page.locator('.cms-nav__link', { hasText: 'Пары цветов' }).click()
  await page.locator('tbody tr', { hasText: `e2e-pair-${tag}` }).click()
  const child = page.locator('.cms-child')
  await child.getByRole('button', { name: 'Добавить' }).click()
  const form = child.locator('.cms-child__form')
  await form.getByLabel('Название').fill(`e2e-slide-top-${tag}`)
  await form.getByLabel('Слайд').selectOption('top')
  await form.locator('input[type=file]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG })
  await expect(form.locator('img.cms-photo__img')).toBeVisible()
  await form.getByRole('button', { name: 'Сохранить' }).click()
  await expect(child.locator('tbody tr', { hasText: `e2e-slide-top-${tag}` })).toBeVisible()

  for (const [slot, priority] of [['side', 10], ['board', 30]] as const) {
    const res = await page.request.post('/api/cms/tables/item_photo', {
      data: { name: `e2e-slide-${slot}-${tag}`, priority, photo: await uploadPhoto(page), slot, item_id: id }
    })
    expect(res.status()).toBe(201)
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()
  try {
    await publish(page)

    const ctx = await browser.newContext()
    const site = await ctx.newPage()
    await site.goto('/colors')
    await expect(site.locator('.card')).toHaveCount(before + 1)
    const card = site.locator('.card', { has: site.locator(`img[alt="e2e-slide-top-${tag}"]`) })
    await expect(card.locator('.card__slide')).toHaveCount(3)
    await expect(card.locator('.card__slide img').evaluateAll((l) => l.map((i) => (i as HTMLImageElement).alt)))
      .resolves.toEqual([`e2e-slide-side-${tag}`, `e2e-slide-top-${tag}`, `e2e-slide-board-${tag}`])
    await ctx.close()
  } finally {
    // the built site must not keep the test pair for the next specs
    await page.request.delete(`/api/cms/tables/item/${id}`)
    await publish(page)
  }
})
