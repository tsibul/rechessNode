/**
 * Delivery cost from the manual tariff table (`delivery_tariff`). Only the server calculates it.
 * @module services/delivery
 */
import type { Knex } from 'knex'
import { db } from '../db'
import { notDeleted } from '../utils/db'

export interface DeliveryQuote {
  cost: number
  tariff_id: number
  tariff_name: string
  weight_g: number
}

export const normCity = (city: string | null | undefined) => (city ?? '').trim().toLowerCase().replace(/ё/g, 'е')

/** Weight of a cart in grams; a product without weight counts as 0. */
export async function cartWeight(cartId: number, k: Knex | Knex.Transaction = db): Promise<number> {
  const rows = await notDeleted(
    k('cart_item as ci').join('item as i', 'i.id', 'ci.item_id').join('product as p', 'p.id', 'i.product_id')
      .where('ci.cart_id', cartId),
    'ci.deleted'
  ).select('ci.quantity', 'p.weight_g')
  return rows.reduce((a, r) => a + r.quantity * Number(r.weight_g ?? 0), 0)
}

/**
 * The most specific tariff: a tariff of the city before the any-city one, then the smallest
 * weight limit, then priority, then price. Null if nothing fits.
 */
export async function quoteDelivery(
  addressDelivery: boolean, city: string | null | undefined, weightG: number, k: Knex | Knex.Transaction = db
): Promise<DeliveryQuote | null> {
  const wanted = normCity(city)
  const rows = await notDeleted(k('delivery_tariff').where({ address_delivery: addressDelivery }))
  const fits = rows.filter((t) =>
    (t.city === null || normCity(t.city) === wanted) && (t.weight_to === null || t.weight_to >= weightG))
  fits.sort((a, b) =>
    Number(a.city === null) - Number(b.city === null)
    || (a.weight_to ?? Infinity) - (b.weight_to ?? Infinity)
    || a.priority - b.priority || a.price - b.price || a.id - b.id)
  const t = fits[0]
  return t ? { cost: Number(t.price), tariff_id: t.id, tariff_name: t.name, weight_g: weightG } : null
}
