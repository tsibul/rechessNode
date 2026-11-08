/**
 * Server-side cart and order creation. Prices come only from the database.
 * @module services/cart
 */
import type { Knex } from 'knex'
import { db } from '../db'
import { ApiError } from '../middleware/error'
import { notDeleted } from '../utils/db'
import { shortProductName } from '../utils/productName'
import { hashToken, newToken } from '../utils/visitor'
import { currentPrice } from './catalog'
import { cartWeight, quoteDelivery } from './delivery'
import { CONFIRM_TTL_MS } from './emailConfirm'
import { trackingUrl } from './mail'

/**
 * Maximum quantity of one product in a cart line.
 */
export const MAX_QUANTITY = 99
/** Recorded when the setting `legal.consent_version` is empty. */
export const DEFAULT_CONSENT_VERSION = 'v1'

/**
 * Cart as sent to the client.
 */
export interface CartView {
  items: { item_id: number; name: string; product_name: string; article: string; photo: string | null; quantity: number; price: number; sum: number }[]
  count: number
  total: number
}

/**
 * Cart view of a visitor without a cart.
 */
export const EMPTY_CART: CartView = { items: [], count: 0, total: 0 }

/**
 * Finds the client by the visitor token.
 * @param token - Visitor token from the cookie.
 * @param k - Knex instance or transaction.
 * @returns The client row, or undefined.
 */
export async function findClient(token: string | null, k: Knex | Knex.Transaction = db) {
  if (!token) return null
  const row = await notDeleted(k('client').where({ tokenHash: hashToken(token) })).first()
  return row ?? null
}

/**
 * Finds the open (not ordered) cart of a client.
 * @param clientId - Client id.
 * @param k - Knex instance or transaction.
 * @returns The cart row, or undefined.
 */
export async function findOpenCart(clientId: number, k: Knex | Knex.Transaction = db) {
  const row = await notDeleted(k('cart').where({ client_id: clientId }).whereNull('ordered'))
    .orderBy('id', 'desc').first()
  return row ?? null
}

/** Cart lines with name, article and photo; price per line from the product's current price. */
async function lines(cartId: number, k: Knex | Knex.Transaction) {
  return notDeleted(
    k('cart_item as ci')
      .join('item as i', 'i.id', 'ci.item_id')
      .join('color as m', 'm.id', 'i.main_color')
      .join('color as s', 's.id', 'i.second_color')
      .where('ci.cart_id', cartId),
    'ci.deleted'
  )
    .join('product as p', 'p.id', 'i.product_id')
    .select('ci.item_id', 'ci.quantity', 'i.name', 'i.product_id', 'p.name as product_name', 'm.code as m_code', 's.code as s_code')
    .orderBy('ci.id')
}

/**
 * Builds the client view of a cart with current prices.
 * @param cartId - Cart id.
 * @param k - Knex instance or transaction.
 * @returns Lines, count and total.
 */
export async function buildCartView(cartId: number, k: Knex | Knex.Transaction = db): Promise<CartView> {
  const rows = await lines(cartId, k)
  const prices = new Map<number, number | null>()
  const items: CartView['items'] = []
  for (const r of rows) {
    if (!prices.has(r.product_id)) prices.set(r.product_id, await currentPrice(r.product_id, k))
    const price = prices.get(r.product_id)
    if (price === null || price === undefined) continue // not for sale
    const photo = await notDeleted(k('item_photo').where({ item_id: r.item_id }))
      .orderBy('priority').orderBy('id').first('photo')
    items.push({
      item_id: r.item_id, name: r.name, product_name: shortProductName(r.product_name), article: `${r.m_code}${r.s_code}`, photo: photo?.photo ?? null,
      quantity: r.quantity, price, sum: price * r.quantity
    })
  }
  return {
    items,
    count: items.reduce((a, i) => a + i.quantity, 0),
    total: items.reduce((a, i) => a + i.sum, 0)
  }
}

async function syncCartSum(cartId: number, k: Knex | Knex.Transaction): Promise<CartView> {
  const view = await buildCartView(cartId, k)
  await k('cart').where({ id: cartId }).update({ sum: view.total, last_updated: k.fn.now() })
  return view
}

/**
 * Returns the cart of a visitor.
 * @param token - Visitor token from the cookie.
 * @returns The cart view (empty when there is none).
 */
export async function getCartView(token: string | null): Promise<CartView> {
  const client = await findClient(token)
  if (!client) return EMPTY_CART
  const cart = await findOpenCart(client.id)
  return cart ? buildCartView(cart.id) : EMPTY_CART
}

/** Add to the cart. Creates the client and cart on first use; returns the cart and a new token if one was issued. */
export async function addItem(token: string | null, itemId: number, quantity: number) {
  return db.transaction(async (trx) => {
    const item = await notDeleted(trx('item').where({ id: itemId })).first('id', 'product_id')
    if (!item) throw new ApiError(404, 'Item not found')
    const product = await notDeleted(trx('product').where({ id: item.product_id })).first('id')
    if (!product) throw new ApiError(404, 'Item not found')

    let issued: string | null = null
    let client = await findClient(token, trx)
    if (!client) {
      issued = newToken()
      const [id] = await trx('client').insert({
        tokenHash: hashToken(issued), name: 'Гость', deleted: false
      })
      client = await trx('client').where({ id }).first()
    }
    let cart = await findOpenCart(client.id, trx)
    if (!cart) {
      const [id] = await trx('cart').insert({ client_id: client.id, sum: 0, deleted: false })
      cart = await trx('cart').where({ id }).first()
    }
    const line = await trx('cart_item').where({ cart_id: cart.id, item_id: itemId }).first()
    if (line) {
      const next = Math.min(MAX_QUANTITY, (line.deleted ? 0 : line.quantity) + quantity)
      await trx('cart_item').where({ id: line.id }).update({ quantity: next, deleted: false })
    } else {
      await trx('cart_item').insert({ cart_id: cart.id, item_id: itemId, quantity, deleted: false })
    }
    return { view: await syncCartSum(cart.id, trx), issued }
  })
}

async function requireCart(token: string | null, k: Knex | Knex.Transaction) {
  const client = await findClient(token, k)
  const cart = client ? await findOpenCart(client.id, k) : null
  if (!cart) throw new ApiError(404, 'Cart line not found')
  return cart
}

/**
 * Sets the quantity of a cart line; zero removes it.
 * @param token - Visitor token.
 * @param itemId - Product id.
 * @param quantity - New quantity.
 * @returns The updated cart view.
 * @throws ApiError 404 when the line does not exist.
 */
export async function setQuantity(token: string | null, itemId: number, quantity: number): Promise<CartView> {
  return db.transaction(async (trx) => {
    const cart = await requireCart(token, trx)
    const line = await trx('cart_item').where({ cart_id: cart.id, item_id: itemId }).first()
    if (!line) throw new ApiError(404, 'Cart line not found')
    if (quantity === 0) await trx('cart_item').where({ id: line.id }).delete()
    else await trx('cart_item').where({ id: line.id }).update({ quantity, deleted: false })
    return syncCartSum(cart.id, trx)
  })
}

/**
 * Removes a cart line.
 * @param token - Visitor token.
 * @param itemId - Product id.
 * @returns The updated cart view.
 */
export async function removeItem(token: string | null, itemId: number): Promise<CartView> {
  return setQuantity(token, itemId, 0)
}

/**
 * Checkout data entered by the buyer.
 */
export interface OrderInput {
  name: string
  family_name?: string | null
  city: string
  phone: string
  e_mail: string
  address_delivery: boolean
  delivery_address: string
  delivery_point_code?: string | null
  comment?: string | null
}

/**
 * Turns the open cart into an order inside a transaction.
 * @param token - Visitor token.
 * @param input - Checkout data.
 * @returns The created order.
 * @throws ApiError 400 when the cart is empty.
 */
export async function createOrder(token: string | null, input: OrderInput) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (trx) => {
        const client = await findClient(token, trx)
        const cart = client ? await findOpenCart(client.id, trx) : null
        if (!client || !cart) throw new ApiError(400, 'Cart is empty')
        const view = await buildCartView(cart.id, trx)
        if (!view.items.length) throw new ApiError(400, 'Cart is empty')

        const weight = await cartWeight(cart.id, trx)
        const quote = await quoteDelivery(input.address_delivery, input.city, weight, trx)
        if (!quote) throw new ApiError(422, 'Delivery is not available')

        const state = await notDeleted(trx('order_state')).orderBy('priority').orderBy('id').first('id')
        if (!state) throw new ApiError(500, 'No order states configured')
        const consent = await trx('setting').where({ code: 'legal.consent_version' }).first('value')
        const maxRow = await trx('order').max({ m: 'number' }).first()
        const number = Number(maxRow?.m ?? 1000) + 1

        const [orderId] = await trx('order').insert({
          number, client_id: client.id, sum: view.total + quote.cost, delivery_cost: quote.cost,
          weight_g: weight, delivery_tariff_id: quote.tariff_id,
          name: input.name, family_name: input.family_name ?? null, city: input.city,
          phone: input.phone, e_mail: input.e_mail,
          delivery_address: input.delivery_address, address_delivery: input.address_delivery,
          delivery_point_code: input.address_delivery ? null : input.delivery_point_code ?? null,
          order_state_id: state.id, payment_state: 'not_paid', comment: input.comment ?? null,
          email_confirm_status: 'pending', confirm_expires_at: new Date(Date.now() + CONFIRM_TTL_MS),
          consent_at: trx.fn.now(), consent_version: consent?.value || DEFAULT_CONSENT_VERSION, deleted: false
        })
        await trx('order_item').insert(view.items.map((i) => ({
          order_id: orderId, item_id: i.item_id, quantity: i.quantity, price: i.price, deleted: false
        })))
        await trx('client').where({ id: client.id }).update({
          name: input.name, family_name: input.family_name ?? null, city: input.city,
          phone: input.phone, e_mail: input.e_mail, address_delivery: input.address_delivery,
          delivery_address: input.delivery_address,
          delivery_point_code: input.address_delivery ? null : input.delivery_point_code ?? null
        })
        await trx('cart').where({ id: cart.id }).update({ ordered: trx.fn.now(), sum: view.total, last_updated: trx.fn.now() })
        return number
      })
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === 'ER_DUP_ENTRY' && attempt < 5) continue
      throw e
    }
  }
}

/** Order view for the owner. Null if it does not exist or belongs to someone else. */
export async function getOrderView(token: string | null, number: number) {
  const client = await findClient(token)
  if (!client) return null
  const order = await notDeleted(db('order').where({ number, client_id: client.id })).first()
  if (!order) return null
  const state = await db('order_state').where({ id: order.order_state_id }).first('name')
  const urlSetting = await db('setting').where({ code: 'delivery.tracking_url' }).first('value')
  const rows = await notDeleted(
    db('order_item as oi')
      .join('item as i', 'i.id', 'oi.item_id')
      .join('product as p', 'p.id', 'i.product_id')
      .join('color as m', 'm.id', 'i.main_color')
      .join('color as s', 's.id', 'i.second_color')
      .where('oi.order_id', order.id),
    'oi.deleted'
  ).select('oi.item_id', 'oi.quantity', 'oi.price', 'i.name', 'p.name as product_name', 'm.code as m_code', 's.code as s_code').orderBy('oi.id')
  return {
    number: order.number, date: order.date, sum: order.sum, delivery_cost: order.delivery_cost ?? null,
    state: state?.name ?? null, payment_state: order.payment_state,
    email_confirm: order.email_confirm_status as 'pending' | 'confirmed' | 'expired',
    confirm_expires_at: order.confirm_expires_at ?? null,
    delivery_reference: order.delivery_reference ?? null,
    tracking_url: trackingUrl(urlSetting?.value ?? '', order.delivery_reference),
    name: order.name, family_name: order.family_name ?? null, city: order.city ?? null,
    phone: order.phone, e_mail: order.e_mail,
    address_delivery: Boolean(order.address_delivery), delivery_address: order.delivery_address,
    delivery_point_code: order.delivery_point_code ?? null, comment: order.comment ?? null,
    items: await Promise.all(rows.map(async (r) => ({
      item_id: r.item_id, name: r.name, product_name: shortProductName(r.product_name),
      photo: (await notDeleted(db('item_photo').where({ item_id: r.item_id })).orderBy('priority').orderBy('id').first('photo'))?.photo ?? null,
      article: `${r.m_code}${r.s_code}`,
      quantity: r.quantity, price: r.price, sum: r.price * r.quantity
    })))
  }
}

/**
 * Returns checkout data remembered from the previous order.
 * @param token - Visitor token.
 * @returns Saved checkout fields, or null when there are none.
 */
export async function getPrefill(token: string | null) {
  const c = await findClient(token)
  if (!c || !c.phone) return null
  return {
    name: c.name, family_name: c.family_name ?? null, city: c.city ?? null, phone: c.phone,
    e_mail: c.e_mail ?? null, address_delivery: Boolean(c.address_delivery),
    delivery_address: c.delivery_address ?? null, delivery_point_code: c.delivery_point_code ?? null
  }
}

/** Delivery options for the current cart and city: cost of each method or null if no tariff fits. */
export async function getDeliveryOptions(token: string | null, city: string | null) {
  const client = await findClient(token)
  const cart = client ? await findOpenCart(client.id) : null
  const weight = cart ? await cartWeight(cart.id) : 0
  const pick = async (door: boolean) => {
    const q = await quoteDelivery(door, city, weight)
    return q ? { cost: q.cost, name: q.tariff_name } : null
  }
  return { weight_g: weight, door: await pick(true), pickup: await pick(false) }
}
