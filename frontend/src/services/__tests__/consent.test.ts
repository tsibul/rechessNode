import { beforeEach, describe, expect, it, vi } from 'vitest'

const startCounters = vi.fn()
vi.mock('../counters', () => ({ startCounters: () => startCounters() }))

const clear = () => { document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' }

async function load() {
  vi.resetModules()
  return import('../consent')
}

describe('cookie consent', () => {
  beforeEach(() => { clear(); startCounters.mockClear() })

  it('asks at the first visit, starts the counters on accept and stays quiet afterwards', async () => {
    const c = await load()
    await c.initConsent()
    expect(c.bannerOpen.value).toBe(true)
    await c.acceptCookies()
    expect(document.cookie).toContain('cookieConsent=accepted')
    expect(c.bannerOpen.value).toBe(false)
    expect(startCounters).toHaveBeenCalledTimes(1)
    const again = await load()
    await again.initConsent()
    expect(again.bannerOpen.value).toBe(false)
  })

  it('a refusal is remembered, closes the banner and starts no counters', async () => {
    const c = await load()
    await c.initConsent()
    await c.declineCookies()
    expect(document.cookie).toContain('cookieConsent=declined')
    expect(c.bannerOpen.value).toBe(false)
    expect(startCounters).not.toHaveBeenCalled()
    const again = await load()
    await again.initConsent()
    expect(again.consent.value).toBe('declined')
    expect(again.bannerOpen.value).toBe(false)
  })
})
