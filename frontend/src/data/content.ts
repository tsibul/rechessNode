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

const DEFAULT_LEGAL_EMAIL = 'info@rechess.ru'
const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Typography of the document texts (rendering only, the text itself is not changed):
 * a line break inside a sentence (the next line starts with a lower-case letter) becomes a space,
 * and the U+2028 line separator, which pasted texts carry, becomes a real line break.
 */
export function tidyHtml(html: string): string {
  return html.replace(/\u2028/g, '<br>').replace(/<br\s*\/?>\s*(?=[а-яёa-z])/g, ' ')
}

/**
 * Texts of the documents carry placeholders instead of values kept elsewhere in the CMS:
 * {{company}} is the seller name ("Сайт" → "Продавец"), {{email}} is the address for requests about the policies (`legal.email`).
 * They are replaced here, so a value is kept in one place.
 */
export function prepareContent(content: SiteContent): SiteContent {
  const values: Record<string, string> = {
    '{{company}}': escapeHtml(content.seller?.name ?? ''),
    // The address for requests about the policies (setting legal.email); an empty one never leaves the policy without it.
    '{{email}}': escapeHtml(content.settings?.['legal.email'] || DEFAULT_LEGAL_EMAIL)
  }
  const fill = (html: string) => {
    let out = html
    for (const [key, value] of Object.entries(values)) if (out.includes(key)) out = out.split(key).join(value)
    return tidyHtml(out)
  }
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

let current: SiteContent = prepareContent(devContent)

export function setSiteContent(content: SiteContent): void {
  current = prepareContent(content)
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
