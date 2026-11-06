import { describe, expect, it } from 'vitest'
import { devContent } from '@/data/fixtures'
import { buildHead, imageUrl, jsonLd, pageUrl } from '../head'
import { pictureSources } from '../picture'

const settings = { ...devContent.settings, 'site.url': 'https://rechess.ru/' }
const seo = { title: 'T', description: 'D', robotsIndex: true }
const metaOf = (h: ReturnType<typeof buildHead>, key: string, value: string) =>
  h.meta.find((m) => m[key] === value)?.content

describe('urls', () => {
  it('builds absolute page and image urls', () => {
    expect(pageUrl('https://rechess.ru/', '/')).toBe('https://rechess.ru/')
    expect(pageUrl('https://rechess.ru/', '/shop')).toBe('https://rechess.ru/shop')
    expect(imageUrl('https://rechess.ru', 'abc.jpg')).toBe('https://rechess.ru/uploads/abc.jpg')
    expect(imageUrl('https://rechess.ru', '/uploads/abc.jpg')).toBe('https://rechess.ru/uploads/abc.jpg')
    expect(imageUrl('https://rechess.ru', 'https://cdn.x/a.jpg')).toBe('https://cdn.x/a.jpg')
    expect(imageUrl('https://rechess.ru', null)).toBeUndefined()
  })
})

describe('buildHead', () => {
  it('writes canonical, Open Graph and twitter:card from the SEO fields', () => {
    const h = buildHead({
      settings, path: '/about', seo: { ...seo, ogTitle: 'OG', ogDescription: 'OGD', ogImage: 'pic.jpg' }
    })
    expect(h.link).toEqual([{ rel: 'canonical', href: 'https://rechess.ru/about' }])
    expect(metaOf(h, 'property', 'og:title')).toBe('OG')
    expect(metaOf(h, 'property', 'og:description')).toBe('OGD')
    expect(metaOf(h, 'property', 'og:image')).toBe('https://rechess.ru/uploads/pic.jpg')
    expect(metaOf(h, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(metaOf(h, 'name', 'twitter:image')).toBe('https://rechess.ru/uploads/pic.jpg')
    expect(metaOf(h, 'name', 'robots')).toBe('index, follow')
  })

  it('falls back to the title, the page photo, then the default image; card is small without an image', () => {
    const none = buildHead({ settings, path: '/', seo })
    expect(metaOf(none, 'property', 'og:title')).toBe('T')
    expect(metaOf(none, 'name', 'twitter:card')).toBe('summary')
    expect(metaOf(none, 'property', 'og:image')).toBeUndefined()
    const photo = buildHead({ settings, path: '/', seo, fallbackImage: '/uploads/p.jpg' })
    expect(metaOf(photo, 'property', 'og:image')).toBe('https://rechess.ru/uploads/p.jpg')
    const dflt = buildHead({ settings: { ...settings, 'seo.og_image': 'd.png' }, path: '/', seo })
    expect(metaOf(dflt, 'property', 'og:image')).toBe('https://rechess.ru/uploads/d.png')
  })

  it('closes service pages: noindex, no canonical, no cards, no JSON-LD', () => {
    const h = buildHead({ settings, path: '/cart', seo: { ...seo, robotsIndex: false } })
    expect(metaOf(h, 'name', 'robots')).toBe('noindex, nofollow')
    expect(h.link).toEqual([])
    expect(h.script).toEqual([])
    expect(h.meta.some((m) => m.property?.startsWith('og:'))).toBe(false)
  })

  it('adds Organization on the home page and Product with the given price on the product page', () => {
    const home = buildHead({ settings, path: '/', seo, seller: devContent.seller })
    const org = JSON.parse(home.script[0].innerHTML)
    expect(org['@type']).toBe('Organization')
    expect(org.legalName).toBe(devContent.seller.name)
    expect(buildHead({ settings, path: '/about', seo }).script).toEqual([])

    const shop = buildHead({ settings, path: '/shop', seo, product: { data: devContent.product, price: 12345 } })
    const product = JSON.parse(shop.script[0].innerHTML)
    expect(product['@type']).toBe('Product')
    expect(product.offers).toMatchObject({ price: '12345', priceCurrency: 'RUB', url: 'https://rechess.ru/shop' })
  })

  it('escapes < in JSON-LD', () => {
    expect(jsonLd({ a: '</script>' })).not.toContain('</script>')
  })
})

describe('pictureSources', () => {
  it('gives AVIF and WebP for an uploaded JPEG/PNG, nothing for other images', () => {
    const name = 'a'.repeat(32)
    expect(pictureSources(`/uploads/${name}.jpg`)).toEqual([
      { type: 'image/avif', srcset: `/uploads/${name}.avif` },
      { type: 'image/webp', srcset: `/uploads/${name}.webp` }
    ])
    expect(pictureSources(`/uploads/${name}.webp`).map((s) => s.type)).toEqual(['image/avif'])
    expect(pictureSources('/img/1.jpg')).toEqual([])
    expect(pictureSources(null)).toEqual([])
  })
})
