/**
 * Anonymous shopping routes: cart, checkout prefill, orders.
 * @module routes/shop
 */
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { ApiError } from '../middleware/error'
import {
  addItem, createOrder, getCartView, getDeliveryOptions, getOrderView, getPrefill, MAX_QUANTITY, removeItem, setQuantity
} from '../services/cart'
import { sendOrderMail } from '../services/mail'
import { wrap } from '../utils/async'
import { normalizePhone } from '../utils/phone'
import { readToken, setClientCookie, setCountCookie } from '../utils/visitor'

export const shopRouter = Router()

const itemId = (v: string) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new ApiError(404, 'Cart line not found')
  return n
}

shopRouter.get('/cart', wrap(async (req, res) => {
  res.json(await getCartView(readToken(req)))
}))

shopRouter.post('/cart/items', wrap(async (req, res) => {
  const body = z.object({
    item_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1)
  }).strict().parse(req.body)
  const { view, issued } = await addItem(readToken(req), body.item_id, body.quantity)
  if (issued) setClientCookie(res, issued)
  setCountCookie(res, view.count)
  res.json(view)
}))

shopRouter.patch('/cart/items/:itemId', wrap(async (req, res) => {
  const body = z.object({ quantity: z.number().int().min(0).max(MAX_QUANTITY) }).strict().parse(req.body)
  const view = await setQuantity(readToken(req), itemId(req.params.itemId), body.quantity)
  setCountCookie(res, view.count)
  res.json(view)
}))

shopRouter.delete('/cart/items/:itemId', wrap(async (req, res) => {
  const view = await removeItem(readToken(req), itemId(req.params.itemId))
  setCountCookie(res, view.count)
  res.json(view)
}))

shopRouter.get('/checkout/prefill', wrap(async (req, res) => {
  res.json({ contact: await getPrefill(readToken(req)) })
}))

shopRouter.get('/checkout/delivery', wrap(async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.slice(0, 255) : null
  res.json(await getDeliveryOptions(readToken(req), city))
}))

const text = (max: number) => z.string().trim().max(max)
const optional = (max: number) => text(max).nullish().transform((v) => (v ? v : null))

const orderSchema = z.object({
  name: text(255).min(1),
  family_name: optional(255),
  city: text(255).min(1),
  phone: z.string().trim().transform((v, ctx) => {
    const p = normalizePhone(v)
    if (!p) ctx.addIssue({ code: 'custom', message: 'Invalid phone' })
    return p ?? ''
  }),
  e_mail: z.string().trim().max(255).email(),
  address_delivery: z.boolean(),
  delivery_address: text(500).min(1),
  delivery_point_code: z.string().trim().max(50).regex(/^[A-Za-z0-9А-Яа-я_-]*$/, 'Invalid code').nullish().transform((v) => (v ? v : null)),
  comment: optional(1000),
  consent: z.literal(true)
}).strict().superRefine((v, ctx) => {
  if (!v.address_delivery && !v.delivery_point_code) {
    ctx.addIssue({ code: 'custom', path: ['delivery_point_code'], message: 'Required for pickup point delivery' })
  }
})

shopRouter.post('/orders', wrap(async (req, res) => {
  const { consent: _consent, ...input } = orderSchema.parse(req.body)
  const token = readToken(req)
  const number = await createOrder(token, input)
  setCountCookie(res, 0)
  // A mail failure is stored in the order and does not fail it.
  await sendOrderMail(await orderId(number), 'confirmation')
  res.status(201).json({ order: await getOrderView(token, number) })
}))

shopRouter.get('/orders/:number', wrap(async (req, res) => {
  const n = Number(req.params.number)
  const order = Number.isInteger(n) ? await getOrderView(readToken(req), n) : null
  if (!order) throw new ApiError(404, 'Not found')
  res.json({ order })
}))

async function orderId(number: number): Promise<number> {
  const row = await db('order').where({ number }).first('id')
  return row.id
}
