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
    const { prepareContent } = await import('../content')
    const base = devContent
    const out = prepareContent({
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

describe('document typography and the policy address', () => {
  it('joins a line break inside a sentence and turns U+2028 into a break', async () => {
    const { tidyHtml } = await import('../content')
    expect(tidyHtml('обобщенной<br>и, следовательно')).toBe('обобщенной и, следовательно')
    expect(tidyHtml('1. Первый<br>2. Второй')).toBe('1. Первый<br>2. Второй')
    expect(tidyHtml('<br>«Об информации»')).toBe('<br>«Об информации»')
    expect(tidyHtml('сайте. 3. Пользуясь')).toBe('сайте.<br>3. Пользуясь')
  })

  it('fills {{email}} from legal.email, or the default, in the cookie policy column', async () => {
    const { prepareContent } = await import('../content')
    const page = { slug: 'x', name: 'x', blocks: [{ code: 'columns', columns: ['a', 'пишите на {{email}}'] }] } as never
    const withSetting = prepareContent({ ...devContent, settings: { ...devContent.settings, 'legal.email': 'law@example.com' }, pages: [page] })
    expect((withSetting.pages[0].blocks[0] as { columns: string[] }).columns[1]).toBe('пишите на law@example.com')
    const empty = prepareContent({ ...devContent, settings: { ...devContent.settings, 'legal.email': '' }, pages: [page] })
    expect((empty.pages[0].blocks[0] as { columns: string[] }).columns[1]).toBe('пишите на info@rechess.ru')
  })

  it('the built cookie policy has no placeholder and keeps the address', async () => {
    const col = (getPage('privacy').blocks.find((b) => b.code === 'columns') as { columns: string[] }).columns[1]
    expect(col).toContain('info@rechess.ru')
    expect(col).not.toContain('{{')
  })
})
