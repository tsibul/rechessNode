import { beforeEach, describe, expect, it, vi } from 'vitest'

async function load(settings: Record<string, string>) {
  vi.resetModules()
  vi.doMock('@/data/content', () => ({ getSetting: (c: string, f = '') => settings[c] || f }))
  return import('../counters')
}

const scripts = () => Array.from(document.head.querySelectorAll('script')).map((s) => s.src)

describe('counters', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('load nothing before the cookie consent', async () => {
    const c = await load({ 'counter.metrika': '123', 'counter.vk': 'VK-RTRG-1-x' })
    c.startCounters()
    expect(scripts()).toEqual([])
  })

  it('start the counters set in the CMS after consent, and only once', async () => {
    document.cookie = 'cookieConsent=accepted; path=/'
    const c = await load({ 'counter.metrika': '123', 'counter.vk': 'VK-RTRG-1-x' })
    c.startCounters()
    c.startCounters()
    expect(scripts()).toEqual(['https://mc.yandex.ru/metrika/tag.js', 'https://vk.com/js/api/openapi.js?169'])
  })

  it('skip counters without a number and never load Google', async () => {
    document.cookie = 'cookieConsent=accepted; path=/'
    const c = await load({})
    c.startCounters()
    expect(scripts()).toEqual([])
  })
})
