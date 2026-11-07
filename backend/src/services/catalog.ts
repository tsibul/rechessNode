/**
 * Catalogue queries: products, pairs, current price, pages, settings, shops.
 * @module services/catalog
 */
import type { Knex } from 'knex'
import { db } from '../db'
import { notDeleted } from '../utils/db'
import { withRatio } from './images'
import { uploadDir } from '../routes/cms/uploads'

/** Current price of a product: latest non-deleted price not later than now. */
export async function currentPrice(productId: number, k: Knex | Knex.Transaction = db): Promise<number | null> {
  const row = await notDeleted(k('price').where('product_id', productId))
    .where('price_date', '<=', k.fn.now())
    .orderBy('price_date', 'desc')
    .orderBy('id', 'desc')
    .first('price')
  return row ? Number(row.price) : null
}

/**
 * Returns published products with prices and photos.
 * @param onlyId - Return only this product.
 * @returns Product list.
 */
export async function getProducts(onlyId?: number) {
  const products = await notDeleted(db('product'))
    .modify((q) => { if (onlyId) q.where('id', onlyId) })
    .orderBy('id')
  const result = []
  for (const p of products) {
    const items = await notDeleted(
      db('item as i')
        .join('color as m', 'm.id', 'i.main_color')
        .join('color as s', 's.id', 'i.second_color')
        .where('i.product_id', p.id),
      'i.deleted'
    )
      .select('i.id', 'i.name',
        'm.id as m_id', 'm.name as m_name', 'm.code as m_code', 'm.hex as m_hex',
        's.id as s_id', 's.name as s_name', 's.code as s_code', 's.hex as s_hex')
      .orderBy('i.id')
    const photos = items.length
      ? await withRatio(uploadDir(), await notDeleted(db('item_photo').whereIn('item_id', items.map((i) => i.id)))
          .orderBy('priority').orderBy('id').select('item_id', 'name', 'photo', 'slot'))
      : []
    result.push({
      id: p.id,
      name: p.name,
      description: p.description,
      price: await currentPrice(p.id),
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        article: `${i.m_code}${i.s_code}`,
        main_color: { id: i.m_id, name: i.m_name, code: i.m_code, hex: i.m_hex },
        second_color: { id: i.s_id, name: i.s_name, code: i.s_code, hex: i.s_hex },
        photos: photos.filter((ph) => ph.item_id === i.id).map((ph) => ({ name: ph.name, photo: ph.photo, slot: ph.slot, ratio: ph.ratio }))
      }))
    })
  }
  return result
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? null
  try { return JSON.parse(value) } catch { return null }
}

function seoOf(row: Record<string, unknown> | undefined) {
  if (!row) return null
  return {
    title: row.title, description: row.description,
    og_title: row.og_title ?? null, og_description: row.og_description ?? null,
    og_image: row.og_image ?? null, robots_index: Boolean(row.robots_index)
  }
}

/**
 * Returns published pages.
 * @param slug - Return only the page with this slug.
 * @returns Page list.
 */
export async function getPages(slug?: string) {
  const pages: { id: number; slug: string; name: string }[] = await notDeleted(db("page")).modify((q) => { if (slug) q.where('slug', slug) }).orderBy('id')
  if (!pages.length) return []
  const ids = pages.map((p) => p.id)
  const blocks = await notDeleted(db('page_block').whereIn('page_id', ids)).orderBy('priority').orderBy('id')
  const seos = await notDeleted(db('seo').whereIn('page_id', ids))
  return pages.map((p) => ({
    slug: p.slug,
    name: p.name,
    blocks: blocks.filter((b) => b.page_id === p.id)
      .map((b) => ({ code: b.code, priority: b.priority, content: parseJson(b.content) })),
    seo: seoOf(seos.find((s) => s.page_id === p.id))
  }))
}

/** Settings that stay in the CMS and never go to the public API (manager addresses). */
const PRIVATE_SETTINGS = new Set(['mail.manager.to'])

/**
 * Returns site settings as a key-value map.
 * @returns Settings by key.
 */
export async function getSettings(): Promise<Record<string, string | number | boolean | null>> {
  const rows = await notDeleted(db('setting')).orderBy('group_name').orderBy('priority')
  const out: Record<string, string | number | boolean | null> = {}
  for (const r of rows) {
    if (PRIVATE_SETTINGS.has(r.code)) continue
    const v: string | null = r.value === undefined || r.value === '' ? null : r.value
    if (v === null) out[r.code] = null
    else if (r.type === 'number') out[r.code] = Number.isNaN(Number(v)) ? null : Number(v)
    else if (r.type === 'boolean') out[r.code] = v === '1' || v === 'true'
    else out[r.code] = v
  }
  return out
}

/**
 * Returns shops shown on the site.
 * @returns Shop list.
 */
export async function getShops() {
  const shops = await notDeleted(db('shops')).orderBy('id')
  const photos = shops.length
    ? await withRatio(uploadDir(), await notDeleted(db('shop_photo').whereIn('shop_id', shops.map((s) => s.id))).orderBy('priority').orderBy('id'))
    : []
  return shops.map((s) => ({
    id: s.id, name: s.name, address: s.address, working_hours: s.working_hours ?? null,
    phone: s.phone ?? null, web_site: s.web_site ?? null,
    photos: photos.filter((p) => p.shop_id === s.id).map((p) => ({ name: p.name, photo: p.photo, ratio: p.ratio }))
  }))
}

/**
 * Returns photos of the home page.
 * @returns Photo list.
 */
export async function getIndexPhotos() {
  const rows = await withRatio(uploadDir(), await notDeleted(db('index_photo')).orderBy('priority').orderBy('id'))
  return rows.map((r) => ({ name: r.name, priority: r.priority, photo: r.photo, ratio: r.ratio }))
}

/**
 * Returns seller details shown in the footer and documents.
 * @returns Seller record.
 */
export async function getSeller() {
  const r = await notDeleted(db('seller')).orderBy('id').first()
  return r ? { name: r.name, ogrn: r.ogrn, inn: r.inn, kpp: r.kpp, address: r.address, phone: r.phone } : null
}
