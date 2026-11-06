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
