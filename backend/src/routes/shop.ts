/**
 * Anonymous shopping routes: cart, checkout prefill, orders.
 * @module routes/shop
 */
import { Request, Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { ApiError } from '../middleware/error'
import {
  addItem, createOrder, findClient, getCartView, getDeliveryOptions, getOrderView, getPrefill, MAX_QUANTITY, removeItem, setQuantity
} from '../services/cart'
import { sendOrderMail } from '../services/mail'
import { assertPaymentAvailable } from '../services/payment'
import { beginConfirmation, changeEmail, confirmByToken, resendLink } from '../services/emailConfirm'
import { getPaymentView, handleNotification, retryPayment, startPayment } from '../services/payments'
import { wrap } from '../utils/async'
import { normalizePhone } from '../utils/phone'
import { readToken, setClientCookie, setCountCookie } from '../utils/visitor'

/**
 * Anonymous shopping routes: cart, delivery options, order creation and payment.
 */
export const shopRouter = Router()

const itemId = (v: string) => {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new ApiError(404, 'Cart line not found')
  return n
}

shopRouter.get('/cart', wrap(async (req, res) => {
  res.json(await getCartView(readToken(req)))
}))

/** Body of `POST /cart/items`. */
export const addItemSchema = z.object({
  item_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1)
}).strict()

/** Body of `PATCH /cart/items/:itemId`. */
export const quantitySchema = z.object({ quantity: z.number().int().min(0).max(MAX_QUANTITY) }).strict()

shopRouter.post('/cart/items', wrap(async (req, res) => {
  const body = addItemSchema.parse(req.body)
  const { view, issued } = await addItem(readToken(req), body.item_id, body.quantity)
  if (issued) setClientCookie(res, issued)
  setCountCookie(res, view.count)
  res.json(view)
}))

shopRouter.patch('/cart/items/:itemId', wrap(async (req, res) => {
  const body = quantitySchema.parse(req.body)
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

/** Body of `POST /orders`. */
export const orderSchema = z.object({
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
  // Production without a real payment provider: no order is created, the buyer gets a clear error.
  assertPaymentAvailable()
  const number = await createOrder(token, input)
  setCountCookie(res, 0)
  // The address is confirmed by a link in the mail (or was confirmed recently): until then no payment and no mail to the managers.
  // A mail failure is stored in the order and does not fail it.
  const id = await orderId(number)
  await beginConfirmation(id)
  const payment = await startPayment(id)
  res.status(201).json({ order: { ...(await getOrderView(token, number)), payment } })
}))

/** Body of `POST /orders/confirm`. */
export const confirmSchema = z.object({ token: z.string().min(1).max(200) }).strict()
/** Body of `POST /orders/:number/confirm/email`. */
export const confirmEmailSchema = z.object({ e_mail: z.string().trim().max(255).email() }).strict()

// The link opens a page that asks for the confirmation: a mail scanner that only fetches the link confirms nothing.
shopRouter.post('/orders/confirm', wrap(async (req, res) => {
  const { token } = confirmSchema.parse(req.body)
  const status = await confirmByToken(token)
  res.json({ status })
}))

shopRouter.post('/orders/:number/confirm/resend', wrap(async (req, res) => {
  await resendLink(await requireOwner(req), orderNumber(req.params.number))
  res.json({ ok: true })
}))

shopRouter.post('/orders/:number/confirm/email', wrap(async (req, res) => {
  const { e_mail } = confirmEmailSchema.parse(req.body)
  await changeEmail(await requireOwner(req), orderNumber(req.params.number), e_mail)
  res.json({ ok: true })
}))

shopRouter.get('/orders/:number', wrap(async (req, res) => {
  const n = Number(req.params.number)
  const order = Number.isInteger(n) ? await getOrderView(readToken(req), n) : null
  if (!order) throw new ApiError(404, 'Not found')
  res.json({ order: { ...order, payment: await getPaymentView((await ownerId(req))!, n) } })
}))

shopRouter.get('/orders/:number/payment', wrap(async (req, res) => {
  res.json({ payment: await getPaymentView(await requireOwner(req), orderNumber(req.params.number)) })
}))

shopRouter.post('/orders/:number/payment', wrap(async (req, res) => {
  res.json({ payment: await retryPayment(await requireOwner(req), orderNumber(req.params.number)) })
}))

/** Notification from the provider (the stub page sends it too). Repeats are harmless. */
shopRouter.post('/payments/:provider/notify', wrap(async (req, res) => {
  const result = await handleNotification(req.params.provider, req)
  res.json({ state: result.state, changed: result.changed })
}))

function orderNumber(v: string): number {
  const n = Number(v)
  if (!Number.isInteger(n) || n < 1) throw new ApiError(404, 'Not found')
  return n
}

async function ownerId(req: Request): Promise<number | null> {
  const client = await findClient(readToken(req))
  return client ? client.id : null
}

async function requireOwner(req: Request): Promise<number> {
  const id = await ownerId(req)
  if (!id) throw new ApiError(404, 'Not found')
  return id
}

async function orderId(number: number): Promise<number> {
  const row = await db('order').where({ number }).first('id')
  return row.id
}
