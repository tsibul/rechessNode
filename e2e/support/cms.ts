import { expect, type Page } from '@playwright/test'
import { readState, type RoleUser } from './state'

export type Role = 'admin' | 'manager' | 'senior'

export function creds(role: Role): RoleUser {
  return readState().users[role]
}

/** Logs in through the CMS form (the session cookie is HttpOnly, so this is the real path). */
export async function login(page: Page, role: Role) {
  const u = creds(role)
  await page.goto('/cms')
  await page.locator('#cms-login').fill(u.login)
  await page.locator('#cms-password').fill(u.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
}

export function menu(page: Page) {
  return page.locator('.cms-nav__link')
}

/** Smallest valid PNG (1x1). */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

/**
 * Starts a publication from the "Публикация" section and waits until THAT publication is done.
 * Polling "the latest publication" is racy: right after the click it can still be the previous build, already
 * "done", so the test would go on before the new site exists. The id comes from the POST response instead.
 */
export async function publishAndWait(page: Page, timeout = 150_000) {
  await page.locator('.cms-nav__link', { hasText: 'Публикация' }).click()
  page.once('dialog', (d) => d.accept())
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/cms/publish') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Опубликовать' }).click()
  ])
  expect(res.status()).toBe(202)
  const id = (await res.json()).publication.id as number
  await expect.poll(async () => {
    const p = (await (await page.request.get(`/api/cms/publications/${id}`)).json()).publication
    return `${p.state}${p.state === 'failed' ? ': ' + p.log : ''}`
  }, { timeout, intervals: [1000] }).toBe('done')
}
