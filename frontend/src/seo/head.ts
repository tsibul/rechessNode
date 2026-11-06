/**
 * Pure builders of the SEO head: meta tags, canonical, Open Graph, twitter:card, JSON-LD.
 * Inputs come from the content layer (CMS), nothing is hard-coded except the structure.
 * @module seo/head
 */
import type { Product, Seller, Seo, Settings } from '@/data/types'

export interface HeadInput {
  seo: Seo
  /** Path of the page, `/` for the home page. */
  path: string
  settings: Settings
  /** Image to use when the page's SEO has none (first photo of the page). */
  fallbackImage?: string | null
  /** Product and its current price: adds `Product` JSON-LD to the page. */
  product?: { data: Product; price: number } | null
  seller?: Seller
}

const trimSlash = (s: string) => s.replace(/\/+$/, '')

/** Absolute URL of a page path on the site. */
export function pageUrl(site: string, path: string): string {
  return path === '/' ? `${trimSlash(site)}/` : `${trimSlash(site)}${path}`
}

/** Absolute URL of an image: full URL, site path, or a bare file name from the CMS upload folder. */
export function imageUrl(site: string, image: string | null | undefined): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//i.test(image)) return image
  return `${trimSlash(site)}${image.startsWith('/') ? image : `/uploads/${image}`}`
}

export function organizationLd(settings: Settings, seller?: Seller): Record<string, unknown> {
  const site = settings['site.url'] ?? ''
  const sameAs = [settings['social.vk'], settings['contact.whatsapp']].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings['site.name'] || 'reChess',
    legalName: seller?.name || undefined,
    url: pageUrl(site, '/'),
    logo: imageUrl(site, settings['seo.og_image']),
    email: settings['contact.email'] || undefined,
    telephone: settings['contact.phone'] || undefined,
    address: seller?.address ? { '@type': 'PostalAddress', streetAddress: seller.address, addressCountry: 'RU' } : undefined,
    sameAs: sameAs.length ? sameAs : undefined
  }
}

export function productLd(settings: Settings, product: Product, price: number, image?: string): Record<string, unknown> {
  const site = settings['site.url'] ?? ''
  const images = [image, ...product.pairs.flatMap((p) => p.photos.map((ph) => imageUrl(site, ph.src)))]
    .filter((x, i, all): x is string => !!x && all.indexOf(x) === i)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images.length ? images : undefined,
    brand: { '@type': 'Brand', name: settings['site.name'] || 'reChess' },
    offers: {
      '@type': 'Offer',
      url: pageUrl(site, '/shop'),
      price: String(price),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/PreOrder',
      itemCondition: 'https://schema.org/NewCondition'
    }
  }
}

/** JSON for a `<script>`: `<` is escaped so the content can never close the tag. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/** Everything for `useHead`. Service pages (`robotsIndex` off) get no canonical, social cards or structured data. */
export function buildHead(input: HeadInput) {
  const { seo, path, settings } = input
  const site = settings['site.url'] ?? ''
  const url = pageUrl(site, path)
  const title = seo.ogTitle || seo.title
  const description = seo.ogDescription || seo.description
  const image = imageUrl(site, seo.ogImage || input.fallbackImage || settings['seo.og_image'])
  const indexable = seo.robotsIndex

  const meta: Array<Record<string, string>> = [
    { name: 'description', content: seo.description },
    { name: 'robots', content: indexable ? 'index, follow' : 'noindex, nofollow' }
  ]
  const link: Array<Record<string, string>> = []
  const script: Array<Record<string, string>> = []

  if (indexable) {
    link.push({ rel: 'canonical', href: url })
    meta.push(
      { property: 'og:type', content: input.product ? 'product' : 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: settings['site.name'] || 'reChess' },
      { property: 'og:locale', content: 'ru_RU' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description }
    )
    if (settings['social.twitter']) meta.push({ name: 'twitter:site', content: settings['social.twitter'] })
    if (image) meta.push({ property: 'og:image', content: image }, { name: 'twitter:image', content: image })

    if (path === '/') {
      script.push({ key: 'ld-org', type: 'application/ld+json', innerHTML: jsonLd(organizationLd(settings, input.seller)) })
    }
    if (input.product) {
      script.push({
        key: 'ld-product', type: 'application/ld+json',
        innerHTML: jsonLd(productLd(settings, input.product.data, input.product.price, image))
      })
    }
  }
  return { title: seo.title, meta, link, script }
}
