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

const COMPANY = '{{company}}'
const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Texts of the documents carry the placeholder {{company}} instead of the company name;
 * it is replaced with the seller name from the CMS ("Сайт" → "Продавец"), so the name is kept in one place.
 */
export function withCompanyName(content: SiteContent): SiteContent {
  const name = escapeHtml(content.seller?.name ?? '')
  const fill = (html: string) => (html.includes(COMPANY) ? html.split(COMPANY).join(name) : html)
  return {
    ...content,
    pages: content.pages.map((p) => ({
      ...p,
      blocks: p.blocks.map((b) => {
        if (b.code === 'text') return { ...b, html: fill(b.html) }
        if (b.code === 'columns') return { ...b, columns: b.columns.map(fill) }
        return b
      })
    }))
  }
}

let current: SiteContent = withCompanyName(devContent)

export function setSiteContent(content: SiteContent): void {
  current = withCompanyName(content)
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
