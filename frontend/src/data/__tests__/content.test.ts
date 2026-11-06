import { describe, it, expect } from 'vitest'
import { getPage, getProduct, getSetting, getShops, pageSlugs } from '../content'

describe('content layer', () => {
  it('has every public page with SEO and blocks', () => {
    for (const slug of ['index', 'about', 'shop', 'colors', 'privacy', 'personal-data']) {
      expect(pageSlugs()).toContain(slug)
      const page = getPage(slug)
      expect(page.seo.title.length).toBeGreaterThan(10)
      expect(page.seo.description.length).toBeGreaterThan(30)
      expect(page.blocks.length).toBeGreaterThan(0)
    }
  })

  it('throws on an unknown page', () => {
    expect(() => getPage('nope')).toThrow()
  })

  it('returns product with colour pairs and an integer price', () => {
    const product = getProduct()
    expect(product.pairs.length).toBeGreaterThan(0)
    expect(Number.isInteger(product.price)).toBe(true)
  })

  it('returns shops and settings with fallback', () => {
    expect(getShops().length).toBeGreaterThan(0)
    expect(getSetting('contact.email')).toContain('@')
    expect(getSetting('missing.code', 'x')).toBe('x')
  })
})
