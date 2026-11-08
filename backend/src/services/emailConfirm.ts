/**
 * Confirmation of the buyer's e-mail. An order waits for the link from the mail for 24 hours:
 * until then it is not paid, not sent to the managers and not tracked; after that it is cancelled.
 * A confirmed address is remembered for 30 days. The token of the link is stored only as a hash.
 * @module services/emailConfirm
 */
import { createHash, randomBytes } from 'crypto'
import { db } from '../db'
import { ApiError } from '../middleware/error'
import { escapeHtml, sendOrderMail } from './mail'
import { startPayment } from './payments'

/** Time the buyer has to confirm the order. */
export const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000
/** How long a confirmed address stays confirmed. */
export const KNOWN_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Pause between two mails with the link for one order. */
export const RESEND_PAUSE_MS = 60 * 1000
/** The first mail plus three more (resend or change of the address). */
export const MAX_SENDS = 4

/**
 * Confirmation state of an order.
 */
export type ConfirmStatus = 'pending' | 'confirmed' | 'expired'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const normalize = (email: string) => email.trim().toLowerCase()

/** Link from the mail; the page of the link asks the server to confirm. */
function linkOf(token: string): string {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/order/confirm/${token}`
}

/** Generates a token, stores its hash and sends the mail. Returns false when the mail failed. */
async function sendLink(orderId: number): Promise<boolean> {
  const token = randomBytes(32).toString('base64url')
  await db('order').where({ id: orderId }).update({
    confirm_sends: db.raw('confirm_sends + 1'), confirm_hash: hash(token), confirm_sent_at: db.fn.now()
  })
  const url = linkOf(token)
  return sendOrderMail(orderId, 'confirm', {
    confirm_url: escapeHtml(url),
    confirm_link: `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#000000;color:#ffffff;text-decoration:none;font-weight:bold">Подтвердить заказ</a>`
  })
}

/** What the buyer gets for a confirmed order: payment, mail with the number, mail to the managers. */
export async function releaseOrder(orderId: number): Promise<void> {
  await startPayment(orderId)
  await sendOrderMail(orderId, 'confirmation')
  await sendOrderMail(orderId, 'manager')
}

/** Marks a pending order as confirmed. Returns false when it was not pending. */
async function markConfirmed(orderId: number, by: 'link' | 'known' | 'manager'): Promise<boolean> {
  const changed = await db('order').where({ id: orderId, email_confirm_status: 'pending' }).update({
    email_confirm_status: 'confirmed', email_confirmed_at: db.fn.now(), email_confirmed_by: by
  })
  return changed > 0
}

/**
 * Called right after the order is created. The address confirmed within the last 30 days
 * confirms the order at once; otherwise the mail with the link goes out.
 * @param orderId - New order.
 * @returns The state of the order after the call.
 */
export async function beginConfirmation(orderId: number): Promise<ConfirmStatus> {
  const o = await db('order').where({ id: orderId }).first('e_mail')
  const known = o && await db('confirmed_email').where({ e_mail: normalize(o.e_mail) }).where('expires_at', '>', db.fn.now()).first('id')
  if (known) {
    if (await markConfirmed(orderId, 'known')) await releaseOrder(orderId)
    return 'confirmed'
  }
  await sendLink(orderId)
  return 'pending'
}

/**
 * Confirms the order by the token from the link. Repeating the same link is harmless.
 * @param token - Token from the link.
 * @returns `confirmed`, or `invalid` for an unknown token, or `expired` when the 24 hours passed.
 */
export async function confirmByToken(token: string): Promise<'confirmed' | 'invalid' | 'expired'> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return 'invalid'
  const o = await db('order').where({ confirm_hash: hash(token), deleted: false }).first('id', 'e_mail', 'email_confirm_status', 'confirm_expires_at')
  if (!o) return 'invalid'
  if (o.email_confirm_status === 'confirmed') return 'confirmed'
  if (o.email_confirm_status === 'expired' || (o.confirm_expires_at && new Date(o.confirm_expires_at).getTime() <= Date.now())) {
    await expirePending()
    return 'expired'
  }
  if (await markConfirmed(o.id, 'link')) {
    const email = normalize(o.e_mail)
    const until = new Date(Date.now() + KNOWN_TTL_MS)
    await db('confirmed_email').insert({ e_mail: email, expires_at: until })
      .onConflict('e_mail').merge({ confirmed_at: db.fn.now(), expires_at: until })
    await releaseOrder(o.id)
  }
  return 'confirmed'
}

/** Cancels the orders that were not confirmed in 24 hours. Returns how many. */
export async function expirePending(): Promise<number> {
  return db('order').where({ email_confirm_status: 'pending' }).where('confirm_expires_at', '<=', db.fn.now())
    .update({ email_confirm_status: 'expired', confirm_hash: null })
}

/** Starts the periodic cancellation of unconfirmed orders. */
export function startExpiryJob(): NodeJS.Timeout {
  const timer = setInterval(() => {
    expirePending().catch((e) => console.error('Cancelling unconfirmed orders failed:', e))
  }, 10 * 60 * 1000)
  timer.unref()
  return timer
}

async function pendingOrder(clientId: number, number: number) {
  const o = await db('order').where({ number, client_id: clientId, deleted: false }).first()
  if (!o) throw new ApiError(404, 'Not found')
  if (o.email_confirm_status === 'pending' && o.confirm_expires_at && new Date(o.confirm_expires_at).getTime() <= Date.now()) {
    await expirePending()
    throw new ApiError(409, 'Order is not waiting for confirmation')
  }
  if (o.email_confirm_status !== 'pending') throw new ApiError(409, 'Order is not waiting for confirmation')
  return o
}

function assertMayResend(o: { confirm_sends: number; confirm_sent_at: Date | string | null }) {
  if (o.confirm_sends >= MAX_SENDS) throw new ApiError(429, 'Too many confirmation mails for this order')
  if (o.confirm_sent_at && Date.now() - new Date(o.confirm_sent_at).getTime() < RESEND_PAUSE_MS) {
    throw new ApiError(429, 'Wait a minute before the next mail')
  }
}

/**
 * Sends the mail with the link again (new link, the old one stops working).
 * @param clientId - Owner of the order.
 * @param number - Order number.
 */
export async function resendLink(clientId: number, number: number): Promise<void> {
  const o = await pendingOrder(clientId, number)
  assertMayResend(o)
  if (!(await sendLink(o.id))) throw new ApiError(502, 'Could not send the mail')
}

/**
 * Corrects the address of a pending order and sends the link there.
 * @param clientId - Owner of the order.
 * @param number - Order number.
 * @param email - New address (already validated).
 */
export async function changeEmail(clientId: number, number: number, email: string): Promise<void> {
  const o = await pendingOrder(clientId, number)
  assertMayResend(o)
  await db('order').where({ id: o.id }).update({ e_mail: email })
  await db('client').where({ id: clientId }).update({ e_mail: email })
  if (!(await sendLink(o.id))) throw new ApiError(502, 'Could not send the mail')
}

/**
 * The manager confirms the order by hand (the buyer cannot or does not want to use the link).
 * The address is not remembered: the buyer did not confirm it.
 * @param orderId - Order id.
 * @throws ApiError 404 for an unknown order, 409 when it is not waiting for confirmation.
 */
export async function confirmByManager(orderId: number): Promise<void> {
  const o = await db('order').where({ id: orderId, deleted: false }).first('id')
  if (!o) throw new ApiError(404, 'Not found')
  if (!(await markConfirmed(orderId, 'manager'))) throw new ApiError(409, 'Order is not waiting for confirmation')
  await releaseOrder(orderId)
}
