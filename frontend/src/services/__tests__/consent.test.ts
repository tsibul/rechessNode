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

  it('asks at the first visit and stays quiet afterwards', async () => {
    const c = await load()
    await c.initConsent()
    expect(c.bannerMode.value).toBe('ask')
    await c.acceptCookies()
    expect(document.cookie).toContain('cookieConsent=accepted')
    expect(c.bannerMode.value).toBeNull()
    expect(startCounters).toHaveBeenCalledTimes(1)
    const again = await load()
    await again.initConsent()
    expect(again.bannerMode.value).toBeNull()
  })

  it('a refusal is remembered, shows the warning and starts no counters', async () => {
    const c = await load()
    await c.initConsent()
    await c.declineCookies()
    expect(document.cookie).toContain('cookieConsent=declined')
    expect(c.bannerMode.value).toBe('declined')
    expect(startCounters).not.toHaveBeenCalled()
    c.closeBanner()
    expect(c.bannerMode.value).toBeNull()
    const again = await load()
    await again.initConsent()
    expect(again.consent.value).toBe('declined')
    expect(again.bannerMode.value).toBeNull()
  })

  it('an order after a refusal asks again and goes on after the consent', async () => {
    const c = await load()
    await c.initConsent()
    await c.declineCookies()
    const answer = c.requireConsent()
    expect(c.bannerMode.value).toBe('order')
    await c.acceptCookies()
    expect(await answer).toBe(true)
    expect(startCounters).toHaveBeenCalledTimes(1)
    expect(await c.requireConsent()).toBe(true)
  })

  it('cancelling the question on the order form keeps the refusal', async () => {
    const c = await load()
    await c.initConsent()
    await c.declineCookies()
    const answer = c.requireConsent()
    c.closeBanner()
    expect(await answer).toBe(false)
    expect(c.consent.value).toBe('declined')
  })
})
