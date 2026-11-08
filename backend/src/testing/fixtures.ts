/**
 * Test fixtures: unique rows in the local database, removed after the run.
 * Not part of the application.
 */
import { randomBytes } from 'crypto'
import { db } from '../db'
import { hashPassword } from '../utils/password'

export const tag = () => `t${Date.now().toString(36)}${randomBytes(3).toString('hex')}`

export interface Catalog {
  productId: number
  colorIds: number[]
  itemIds: number[]
  priceIds: number[]
}

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Colour with a random unique 2-character code (retries on a clash with other rows). */
async function insertColor(prefix: string, letter: string): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    const code = CODE_CHARS[Math.floor(Math.random() * 36)] + CODE_CHARS[Math.floor(Math.random() * 36)]
    try {
      const [id] = await db('color').insert({ name: `${prefix} ${letter}`, code, hex: '112233', deleted: false })
      return id
    } catch (e) {
      if ((e as { code?: string }).code !== 'ER_DUP_ENTRY' || attempt > 20) throw e
    }
  }
}

/** Product with 2 pairs, prices: past 100, later past 200, future 300, deleted-latest 400. */
export async function createCatalog(prefix: string): Promise<Catalog> {
  const [productId] = await db('product').insert({ name: `${prefix} product`, description: 'd', deleted: false })
  const colorIds: number[] = []
  for (const letter of ['A', 'B', 'C']) {
    colorIds.push(await insertColor(prefix, letter))
  }
  const itemIds: number[] = []
  for (const [m, s] of [[0, 1], [1, 2]]) {
    const [id] = await db('item').insert({
      name: `${prefix} pair ${m}${s}`, main_color: colorIds[m], second_color: colorIds[s], product_id: productId, deleted: false
    })
    itemIds.push(id)
  }
  await db('item_photo').insert({ name: 'p', priority: 1, photo: `${prefix}.jpg`, item_id: itemIds[0], deleted: false })
  const priceIds: number[] = []
  const rows = [
    { price: 100, price_date: '2020-01-01 00:00:00', deleted: false },
    { price: 200, price_date: '2021-01-01 00:00:00', deleted: false },
    { price: 300, price_date: '2099-01-01 00:00:00', deleted: false },
    { price: 400, price_date: '2022-01-01 00:00:00', deleted: true }
  ]
  for (const r of rows) {
    const [id] = await db('price').insert({ ...r, product_id: productId })
    priceIds.push(id)
  }
  return { productId, colorIds, itemIds, priceIds }
}

export async function dropCatalog(c: Catalog): Promise<void> {
  await db('order_item').whereIn('item_id', c.itemIds).delete()
  await db('cart_item').whereIn('item_id', c.itemIds).delete()
  await db('item_photo').whereIn('item_id', c.itemIds).delete()
  await db('item').whereIn('id', c.itemIds).delete()
  await db('price').where({ product_id: c.productId }).delete()
  await db('color').whereIn('id', c.colorIds).delete()
  await db('product').where({ id: c.productId }).delete()
}

export const TEST_PASSWORD = 'test-password-1'

export async function createUser(prefix: string, roleCode: string) {
  const role = await db('role').where({ code: roleCode }).first('id')
  const login = `${prefix}-${roleCode}`
  const [id] = await db('user').insert({
    name: `${prefix} ${roleCode}`, login, password: await hashPassword(TEST_PASSWORD), role_id: role.id, deleted: false
  })
  return { id: id as number, login }
}

/** Removes clients (by id list) with their carts and orders. */
export async function dropClients(ids: number[]): Promise<void> {
  if (!ids.length) return
  const mails = [...await db('order').whereIn('client_id', ids).pluck('e_mail'), ...await db('client').whereIn('id', ids).pluck('e_mail')]
    .filter(Boolean).map((e: string) => e.toLowerCase())
  if (mails.length) await db('confirmed_email').whereIn('e_mail', mails).delete()
  const orders = await db('order').whereIn('client_id', ids).pluck('id')
  if (orders.length) await db('order_item').whereIn('order_id', orders).delete()
  await db('order').whereIn('client_id', ids).delete()
  const carts = await db('cart').whereIn('client_id', ids).pluck('id')
  if (carts.length) await db('cart_item').whereIn('cart_id', carts).delete()
  await db('cart').whereIn('client_id', ids).delete()
  await db('client').whereIn('id', ids).delete()
}

/** Marks the addresses as confirmed (30 days): orders from them are confirmed at once. Removed by `dropClients`. */
export async function rememberEmails(...emails: string[]): Promise<void> {
  for (const e of emails) {
    await db('confirmed_email').insert({ e_mail: e.toLowerCase(), expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000) })
      .onConflict('e_mail').merge()
  }
}

export interface Tariffs { city: string; ids: number[] }

/** Tariffs of a unique city: door 250 / pickup 150 up to 1000 g, door 400 / pickup 300 above (no limit). */
export async function createTariffs(prefix: string): Promise<Tariffs> {
  const city = `${prefix}-city`
  const rows = [
    { name: `${prefix} door light`, address_delivery: true, weight_to: 1000, price: 250 },
    { name: `${prefix} door heavy`, address_delivery: true, weight_to: null, price: 400 },
    { name: `${prefix} pickup light`, address_delivery: false, weight_to: 1000, price: 150 },
    { name: `${prefix} pickup heavy`, address_delivery: false, weight_to: null, price: 300 }
  ]
  const ids: number[] = []
  for (const r of rows) {
    const [id] = await db('delivery_tariff').insert({ ...r, city, priority: 1, deleted: false })
    ids.push(id)
  }
  return { city, ids }
}

export async function dropTariffs(t: Tariffs): Promise<void> {
  await db('order').whereIn('delivery_tariff_id', t.ids).update({ delivery_tariff_id: null })
  await db('delivery_tariff').whereIn('id', t.ids).delete()
}
