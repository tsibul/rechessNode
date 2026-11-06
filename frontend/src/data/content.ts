/**
 * Access layer for the content of public pages.
 *
 * Pages are rendered at build time (vite-ssg), so the content is read
 * synchronously from one `SiteContent` object. Now it is the development
 * fixture; once `docs/API.md` is available the build fetches the same shape
 * from the backend and passes it to `setSiteContent` before rendering.
 */
import type { PageContent, Product, Seller, Settings, Shop, SiteContent } from './types'
import { devContent } from './fixtures'

let current: SiteContent = devContent

export function setSiteContent(content: SiteContent): void {
  current = content
}

export function getPage(slug: string): PageContent {
  const page = current.pages.find((p) => p.slug === slug)
  if (!page) throw new Error(`Page "${slug}" is not in the content`)
  return page
}

export function getSettings(): Settings {
  return current.settings
}

export function getSetting(code: string, fallback = ''): string {
  return current.settings[code] || fallback
}

export function getProduct(): Product {
  return current.product
}

export function getShops(): Shop[] {
  return current.shops
}

export function getSeller(): Seller {
  return current.seller
}

export function pageSlugs(): string[] {
  return current.pages.map((p) => p.slug)
}
