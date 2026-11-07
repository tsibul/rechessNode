import { describe, it, expect } from 'vitest'
import { getPage, getProduct, getSetting, getShops, pageSlugs } from '../content'
import { devContent } from '../fixtures'

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

describe('company name in the documents', () => {
  it('fills {{company}} with the escaped seller name, only in texts and columns', async () => {
    const { withCompanyName } = await import('../content')
    const base = devContent
    const out = withCompanyName({
      ...base,
      seller: { ...base.seller, name: 'ООО «Ромашка & Ко»' },
      pages: [{
        slug: 'x', name: 'x',
        blocks: [{ code: 'text', html: '<p>Оператор {{company}}</p>' }, { code: 'columns', columns: ['{{company}}', 'нет'] }, { code: 'colors' }]
      } as never]
    })
    const [text, cols, colors] = out.pages[0].blocks as never[]
    expect((text as { html: string }).html).toBe('<p>Оператор ООО «Ромашка &amp; Ко»</p>')
    expect((cols as { columns: string[] }).columns).toEqual(['ООО «Ромашка &amp; Ко»', 'нет'])
    expect(colors).toEqual({ code: 'colors' })
  })
})
