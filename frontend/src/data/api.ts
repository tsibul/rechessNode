/**
 * Maps the `GET /api/site` response (docs/API.md) to the content model of the pages.
 * The CMS may leave things empty: whatever the API does not provide is taken from the
 * development content, so a page is never rendered empty.
 */
import { api } from '@/services/api'
import { devContent } from './fixtures'
import type { ColorPair, PageBlock, PageContent, Photo, Product, Seller, Shop, SiteContent } from './types'

/** Photo as the API returns it. */
export interface ApiPhoto { name: string; photo: string; slot?: string; ratio?: number }
/** Content of a page block: the fields depend on the block code, so all are optional and checked where used. */
export interface ApiBlockContent {
  title?: string
  hide_title?: boolean
  html?: string
  columns?: unknown[]
  photos?: Array<{ name?: string; photo?: string; ratio?: number } | null>
}
/** Shape of the `/api/site` response. */
export interface ApiSite {
  settings: Record<string, string | number | boolean | null>
  pages: Array<{
    slug: string; name: string
    blocks: Array<{ code: string; priority: number; content: ApiBlockContent | null }>
    seo: { title: string; description: string; og_title: string | null; og_description: string | null; og_image: string | null; robots_index: boolean } | null
  }>
  products: Array<{
    id: number; name: string; description: string | null; price: number | null
    items: Array<{
      id: number; name: string
      main_color: { name: string; hex: string }; second_color: { name: string; hex: string }
      photos: ApiPhoto[]
    }>
  }>
  shops: Array<{ id: number; name: string; address: string; working_hours: string | null; phone: string | null; web_site: string | null; photos: ApiPhoto[] }>
  index_photos: ApiPhoto[]
  seller: { name: string; ogrn: string; inn: string; address: string; phone: string } | null
}

/**
 * Builds the URL of an uploaded file.
 * @param file - Stored file name.
 * @returns URL path.
 */
export function uploadUrl(file: string): string {
  // Same on the server and in the browser: the built HTML must not carry a build-time host.
  return `/uploads/${file}`
}

const photo = (p: ApiPhoto, ratio = 1): Photo => ({ src: uploadUrl(p.photo), alt: p.name, ratio: p.ratio ?? ratio })
const hex = (h: string) => (h.startsWith('#') ? h : `#${h}`)

const SLOTS = ['side', 'top', 'board']
const slotRank = (s?: string) => { const i = SLOTS.indexOf(s ?? 'side'); return i < 0 ? 0 : i }

function mapProduct(site: ApiSite): Product {
  const p = site.products.find((x) => x.price !== null && x.items.length)
  if (!p) return devContent.product
  const pairs: ColorPair[] = p.items.map((i) => ({
    id: i.id,
    name: i.name,
    main: { name: i.main_color.name, hex: hex(i.main_color.hex) },
    second: { name: i.second_color.name, hex: hex(i.second_color.hex) },
    photos: i.photos.length ? [...i.photos].sort((a, b) => slotRank(a.slot) - slotRank(b.slot)).map((x) => photo(x)) : [{ src: null, alt: i.name, ratio: 1 }]
  }))
  return { id: p.id, name: p.name, description: p.description ?? '', price: p.price as number, pairs }
}

function mapBlock(b: ApiSite['pages'][number]['blocks'][number], site: ApiSite, slug: string): PageBlock | null {
  const c = b.content ?? {}
  switch (b.code) {
    case 'text':
      return typeof c.html === 'string' && c.html ? { code: 'text', title: c.title, hideTitle: c.hide_title === true, html: c.html } : null
    case 'columns':
      return Array.isArray(c.columns) && c.columns.length ? { code: 'columns', title: c.title, columns: c.columns.map(String) } : null
    case 'gallery': {
      const own: Photo[] = Array.isArray(c.photos)
        ? c.photos.filter((p): p is { name?: string; photo: string; ratio?: number } => Boolean(p && p.photo)).map((p) => photo({ name: p.name ?? '', photo: p.photo }, p.ratio ?? 1))
        : []
      const photos = own.length ? own : slug === 'index' ? site.index_photos.map((p) => photo(p)) : []
      return photos.length ? { code: 'gallery', photos } : null
    }
    case 'product': return { code: 'product' }
    case 'colors': return { code: 'colors' }
    default: return null // hero, shops etc.: no component yet
  }
}

function mapPage(fixture: PageContent, site: ApiSite): PageContent {
  const api = site.pages.find((p) => p.slug === fixture.slug)
  if (!api) return fixture
  const blocks = api.blocks.map((b) => mapBlock(b, site, fixture.slug)).filter((b): b is PageBlock => b !== null)
  const s = api.seo
  return {
    slug: fixture.slug,
    name: api.name || fixture.name,
    blocks: blocks.length ? blocks : fixture.blocks,
    seo: s && s.title && s.description
      ? {
          title: s.title, description: s.description,
          ogTitle: s.og_title ?? undefined, ogDescription: s.og_description ?? undefined,
          ogImage: s.og_image ? (/^(https?:)?\//.test(s.og_image) ? s.og_image : uploadUrl(s.og_image)) : undefined, robotsIndex: s.robots_index
        }
      : fixture.seo
  }
}

/** Settings the customer maintains in the CMS: contacts, social links, signature, shop texts. */
const CMS_OWNED = /^(contact\.|social\.|footer\.credit$|shop\.|company\.|legal\.email$)/

/**
 * Converts the API response into the site content model.
 * @param site - API response.
 * @returns Site content.
 */
export function mapSite(site: ApiSite): SiteContent {
  const settings: Record<string, string> = { ...devContent.settings }
  for (const [k, v] of Object.entries(site.settings)) if (v !== null && v !== '') settings[k] = String(v)
  // Contacts belong to the CMS: once the API has answered, an emptied value stays empty
  // and never brings back the demo value from the development content.
  for (const k of Object.keys(settings)) if (CMS_OWNED.test(k)) settings[k] = site.settings[k] == null ? '' : String(site.settings[k])
  const seller: Seller = site.seller ? { name: site.seller.name, ogrn: site.seller.ogrn, inn: site.seller.inn, address: site.seller.address, phone: site.seller.phone } : devContent.seller
  const shops: Shop[] = site.shops.length
    ? site.shops.map((s) => ({
        id: s.id, name: s.name, address: s.address, workingHours: s.working_hours, phone: s.phone, webSite: s.web_site,
        photos: s.photos.map((p) => photo(p, 1.33))
      }))
    : []
  return {
    settings,
    seller,
    shops,
    product: mapProduct(site),
    pages: devContent.pages.map((p) => mapPage(p, site))
  }
}

/** Reads the whole site from the backend. Falls back to the development content when the API is unreachable. */
export async function loadSite(): Promise<SiteContent> {
  try {
    return mapSite(await api<ApiSite>('/site'))
  } catch (e) {
    // A publication must never replace the site with the development texts.
    if (import.meta.env.SSR && process.env.REQUIRE_API === '1') throw e
    console.warn('Site content from API is not available, using development content:', (e as Error).message)
    return devContent
  }
}
