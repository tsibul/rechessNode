/**
 * Content model of the public pages. Mirrors docs/DATA_MODEL.md:
 * `page` + `page_block` (JSON content), `seo`, `setting`, `shops` + `shop_photo`,
 * `product` + `item` (colour pairs) + `price`.
 */

/** Photo from the CMS. Empty `src` renders a grey placeholder with the same aspect ratio. */
export interface Photo {
  src: string | null
  alt: string
  /** Width / height, used for the placeholder and to reserve space. */
  ratio: number
}

export interface Seo {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  robotsIndex: boolean
}

export type PageBlock =
  | { code: 'gallery'; photos: Photo[] }
  | { code: 'text'; title?: string; html: string }
  | { code: 'product' }
  | { code: 'shops' }

export interface PageContent {
  slug: string
  name: string
  seo: Seo
  blocks: PageBlock[]
}

export interface Color {
  name: string
  hex: string
}

/** Allowed colour pair (`item`). */
export interface ColorPair {
  id: number
  name: string
  main: Color
  second: Color
  photos: Photo[]
}

export interface Product {
  id: number
  name: string
  description: string
  /**
   * Price in whole roubles as of the build. The order flow (stage 7) always
   * asks the backend for the price, this value is only for the rendered page.
   */
  price: number
  pairs: ColorPair[]
}

export interface Shop {
  id: number
  name: string
  address: string
  workingHours: string | null
  phone: string | null
  webSite: string | null
  photos: Photo[]
}

export interface Seller {
  name: string
  ogrn: string
  inn: string
  address: string
  phone: string
}

/** `setting` rows as a code → value map. */
export type Settings = Record<string, string>

export interface SiteContent {
  settings: Settings
  seller: Seller
  pages: PageContent[]
  product: Product
  shops: Shop[]
}
