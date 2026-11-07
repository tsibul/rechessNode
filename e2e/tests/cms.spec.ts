import { test, expect } from '@playwright/test'
import { login, menu, publishAndWait } from '../support/cms'
import { readState } from '../support/state'

const MANAGER = ['Заказы', 'Клиенты', 'Корзины']
const SENIOR_EXTRA = ['Товары', 'Пары цветов', 'Цвета', 'Цены', 'SEO', 'Тарифы доставки', 'Публикация']
const ADMIN_ONLY = ['Страницы', 'Настройки', 'Пользователи', 'Роли и права']

test.describe('CMS roles', () => {
  test('manager: only orders, clients, carts; the rest is forbidden', async ({ page }) => {
    await login(page, 'manager')
    const titles = await menu(page).allInnerTexts()
    for (const t of MANAGER) expect(titles).toContain(t)
    for (const t of [...SENIOR_EXTRA, ...ADMIN_ONLY]) expect(titles).not.toContain(t)
    for (const t of ['price', 'delivery_tariff', 'user', 'setting', 'page', 'seo']) {
      expect((await page.request.get(`/api/cms/tables/${t}`)).status(), t).toBe(403)
    }
    expect((await page.request.post('/api/cms/publish')).status()).toBe(403)
    expect((await page.request.post('/api/cms/tables/delivery_tariff', { data: { name: 'x', price: 1 } })).status()).toBe(403)
    expect((await page.request.get('/api/cms/tables/order')).status()).toBe(200)
  })

  test('senior manager: references, prices, seo, tariffs, publication; no pages, settings, users', async ({ page }) => {
    await login(page, 'senior')
    const titles = await menu(page).allInnerTexts()
    for (const t of [...MANAGER, ...SENIOR_EXTRA]) expect(titles).toContain(t)
    for (const t of ADMIN_ONLY) expect(titles).not.toContain(t)
    for (const t of ['user', 'setting', 'page_block']) {
      expect((await page.request.get(`/api/cms/tables/${t}`)).status(), t).toBe(403)
    }
    // Pages are readable for the SEO editor (to pick a page), but not writable.
    expect((await page.request.get('/api/cms/tables/page')).status()).toBe(200)
    expect((await page.request.post('/api/cms/tables/page', { data: { slug: 'e2e-x', name: 'x' } })).status()).toBe(403)
    expect((await page.request.get('/api/cms/roles')).status()).toBe(403)
  })

  test('admin: sees everything', async ({ page }) => {
    await login(page, 'admin')
    const titles = await menu(page).allInnerTexts()
    for (const t of [...MANAGER, ...SENIOR_EXTRA, ...ADMIN_ONLY]) expect(titles).toContain(t)
    expect((await page.request.get('/api/cms/roles')).status()).toBe(200)
  })

  test('wrong password is refused, logout ends the session', async ({ page }) => {
    await page.goto('/cms')
    await page.locator('#cms-login').fill(readState().users.manager.login)
    await page.locator('#cms-password').fill('definitely-wrong')
    await page.getByRole('button', { name: 'Войти' }).click()
    await expect(page.locator('.cms-error--box')).toBeVisible()
    await login(page, 'manager')
    await page.getByRole('button', { name: 'Выйти' }).click()
    await expect(page.locator('#cms-login')).toBeVisible()
    expect((await page.request.get('/api/cms/tables/order')).status()).toBe(401)
  })
})

test.describe('CMS work', () => {
  test('order card: status, track number, mail', async ({ page, request }) => {
    // An order made as a buyer (own cookie jar), then handled in the CMS.
    const add = await request.post('/api/cart/items', { data: { item_id: 1, quantity: 1 } })
    expect(add.ok()).toBeTruthy()
    const { tag } = readState()
    const res = await request.post('/api/orders', {
      data: {
        name: 'Пётр', family_name: 'Тестов', phone: '+7 999 000-00-02', e_mail: `e2e-${tag}-cms@example.com`,
        city: 'Москва', delivery_address: 'Москва, ул. Тестовая, 2', address_delivery: true, consent: true
      }
    })
    expect(res.status(), await res.text()).toBe(201)
    const number = (await res.json()).order.number

    await login(page, 'manager')
    await page.locator('.cms-nav__link', { hasText: 'Заказы' }).click()
    await page.locator('tbody tr', { hasText: String(number) }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`№ ${number}`)
    await expect(dialog).toContainText('Тестов')
    // Payment status of the stub is visible; the place for the 54-FZ receipt is there.
    await expect(dialog.getByTestId('order-payment')).toContainText('Ожидает оплаты')
    await expect(dialog.getByTestId('order-payment')).toContainText('заглушка')
    await expect(dialog.getByTestId('order-receipt')).toBeVisible()
    await dialog.getByRole('textbox', { name: /Трек-номер/ }).fill('E2E123456')
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    // The card stays open after saving (it shows the saved record); the track is in the details.
    await expect(dialog).toContainText('E2E123456')
    // The failed or missing manager mail is visible in the card.
    await expect(dialog.getByTestId('order-manager-mail')).toBeVisible()
    await dialog.getByRole('button', { name: 'Закрыть' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('tbody tr', { hasText: String(number) }).first()).toBeVisible()
  })

  test('orders by status: chips with counters, status change in the card, link from the mail', async ({ page, request }) => {
    const add = await request.post('/api/cart/items', { data: { item_id: 1, quantity: 1 } })
    expect(add.ok()).toBeTruthy()
    const { tag } = readState()
    const res = await request.post('/api/orders', {
      data: {
        name: 'Анна', family_name: 'Статусова', phone: '+7 999 000-00-03', e_mail: `e2e-${tag}-state@example.com`,
        city: 'Москва', delivery_address: 'Москва, ул. Тестовая, 3', address_delivery: true, consent: true
      }
    })
    expect(res.status(), await res.text()).toBe(201)
    const number = (await res.json()).order.number

    await login(page, 'manager')
    await page.locator('.cms-nav__link', { hasText: 'Заказы' }).click()
    const chips = page.getByTestId('state-chips')
    await expect(chips).toBeVisible()
    const newChip = chips.locator('.cms-chip', { hasText: 'Новый' })
    const count = async (c: typeof newChip) => Number(await c.locator('b').innerText())
    const before = await count(newChip)
    expect(before).toBeGreaterThan(0)
    await newChip.click()
    await expect(page.locator('tbody tr', { hasText: String(number) }).first()).toBeVisible()

    await page.locator('tbody tr', { hasText: String(number) }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Статус').selectOption({ label: 'Подтверждён' })
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(dialog).toContainText('Подтверждён')
    await dialog.getByRole('button', { name: 'Закрыть' }).click()
    await expect.poll(() => count(newChip)).toBe(before - 1)
    await expect(page.locator('tbody tr', { hasText: String(number) })).toHaveCount(0)
    const listed = page.waitForResponse((r) => r.url().includes('/tables/order?') && r.url().includes('order_state_id'))
    await chips.locator('.cms-chip', { hasText: 'Подтверждён' }).click()
    const id = ((await (await listed).json()).rows as Array<{ id: number; number: number }>).find((r) => r.number === number)?.id
    await expect(page.locator('tbody tr', { hasText: String(number) }).first()).toBeVisible()

    // The link from the manager mail opens the card.
    expect(id).toBeTruthy()
    await page.goto(`/cms#orders/${id}`)
    await expect(page.getByRole('dialog')).toContainText(`№ ${number}`)
  })

  test('tariffs: create, edit, delete', async ({ page }) => {
    await login(page, 'senior')
    await page.locator('.cms-nav__link', { hasText: 'Тарифы доставки' }).click()
    const name = `e2e-tariff-${readState().tag}`
    await page.getByRole('button', { name: 'Добавить' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Название').fill(name)
    await dialog.getByLabel('Цена, ₽').fill('777')
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    await dialog.getByRole('button', { name: 'Закрыть' }).click()
    await expect(dialog).toBeHidden()
    const row = page.locator('tbody tr', { hasText: name })
    await expect(row).toBeVisible()
    await row.click()
    await page.getByRole('dialog').getByLabel('Цена, ₽').fill('888')
    await page.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('tbody tr', { hasText: name })).toContainText('888')
    page.once('dialog', (d) => d.accept())
    await page.locator('tbody tr', { hasText: name }).getByRole('button', { name: 'Удалить' }).click()
    await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(0)
  })

  test('edit a setting and publish: the change reaches the public site', async ({ page, browser }) => {
    test.setTimeout(240_000)
    await login(page, 'admin')
    await page.locator('.cms-nav__link', { hasText: 'Настройки' }).click()
    const row = page.locator('.cms-setting', { has: page.locator('code', { hasText: /^cookie\.banner\.button$/ }) })
    const word = `Понятно${Date.now() % 100000}`
    const input = row.locator('input.cms-input')
    const original = await input.inputValue()
    await input.fill(word)
    await row.getByRole('button', { name: 'Сохранить' }).click()
    await expect(row.getByRole('button', { name: 'Сохранено' })).toBeVisible()

    try {
      await publishAndWait(page, 120_000)
      await expect(page.locator('.cms-badge--done').first()).toBeVisible()

      const pub = await browser.newContext()
      const site = await pub.newPage()
      await site.goto('/shop')
      await expect(site.getByTestId('cookie-consent')).toContainText(word)
      await pub.close()
    } finally {
      await page.locator('.cms-nav__link', { hasText: 'Настройки' }).click()
      const back = page.locator('.cms-setting', { has: page.locator('code', { hasText: /^cookie\.banner\.button$/ }) })
      await back.locator('input.cms-input').fill(original)
      await back.getByRole('button', { name: 'Сохранить' }).click()
      await expect(back.getByRole('button', { name: 'Сохранено' })).toBeVisible()
    }
  })
})
