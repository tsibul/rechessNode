import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../api', async (orig) => {
  const actual = await orig<typeof import('../api')>()
  return { ...actual, cmsApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } }
})

import { cmsApi, errorMessage, http } from '../api'
import { useCmsStore } from '../../store/cms'

const manager = {
  id: 1, name: 'M', login: 'm', role: { id: 2, code: 'manager', name: 'Менеджер' }, permissions: ['orders', 'clients', 'carts']
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('cms store', () => {
  it('logs in and exposes only the sections allowed by the role', async () => {
    vi.mocked(cmsApi.login).mockResolvedValue(manager)
    const s = useCmsStore()
    expect(await s.login('m', 'secret-pass')).toBe(true)
    expect(s.can('orders')).toBe(true)
    expect(s.can('users')).toBe(false)
    expect(s.sections.map((x) => x.key)).toEqual(['orders', 'clients', 'carts'])
  })

  it('keeps the error text on a failed login', async () => {
    vi.mocked(cmsApi.login).mockRejectedValue({ response: { status: 401, data: { error: 'Invalid login or password' } } })
    const s = useCmsStore()
    expect(await s.login('m', 'x')).toBe(false)
    expect(s.error).toBe('Invalid login or password')
    expect(s.user).toBeNull()
  })

  it('restores the session from the cookie, or stays logged out', async () => {
    vi.mocked(cmsApi.me).mockResolvedValueOnce(manager)
    const s = useCmsStore()
    await s.restore()
    expect(s.user?.login).toBe('m')
    vi.mocked(cmsApi.me).mockRejectedValueOnce(new Error('401'))
    await s.restore()
    expect(s.user).toBeNull()
    expect(s.checked).toBe(true)
  })

  it('drops the user on logout even if the request fails', async () => {
    vi.mocked(cmsApi.login).mockResolvedValue(manager)
    vi.mocked(cmsApi.logout).mockRejectedValue(new Error('net'))
    const s = useCmsStore()
    await s.login('m', 'x')
    await s.logout().catch(() => {})
    expect(s.user).toBeNull()
  })
})

describe('errorMessage', () => {
  it('formats validation details, plain errors and network errors', () => {
    expect(errorMessage({ response: { status: 400, data: { error: 'Validation Error', details: [{ path: ['code'], message: 'Too short' }] } } }))
      .toBe('code: Too short')
    expect(errorMessage({ response: { status: 409, data: { error: 'Duplicate' } } })).toBe('Duplicate')
    expect(errorMessage({ response: { status: 500, data: {} } })).toBe('Ошибка 500')
    expect(errorMessage(new Error('offline'))).toBe('offline')
  })

  it('uses credentials and the CMS prefix', () => {
    expect(http.defaults.withCredentials).toBe(true)
    expect(http.defaults.baseURL).toBe('/api/cms')
  })
})
