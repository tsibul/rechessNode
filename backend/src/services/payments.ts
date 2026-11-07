/**
 * Payment of an order: start, retry, notifications. All results are idempotent:
 * a repeated notification never changes the outcome, `paid` is final.
 * The amount is always the order sum from the database.
 * @module services/payments
 */
import { db } from '../db'
import { ApiError } from '../middleware/error'
import { assertPaymentAvailable, getProvider, getProviderByCode } from './payment'
import type { PaymentNotification, PaymentStatus } from './payment/types'

export const PAYMENT_STATES = ['not_paid', 'pending', 'paid', 'failed', 'refunded'] as const
export type PaymentState = (typeof PAYMENT_STATES)[number]

export interface PaymentView {
  provider: string | null
  state: PaymentState
  amount: number
  /** Where to pay; null when there is nothing to pay (paid, refunded, no provider). */
  url: string | null
  /** Stub only: reference for the stub page. Real providers never expose it. */
  ref: string | null
  stub: boolean
}

/** Allowed moves. `paid` can only go to `refunded` (by hand in the CMS). */
const NEXT: Record<PaymentState, PaymentStatus[]> = {
  not_paid: ['pending', 'paid', 'failed'],
  pending: ['paid', 'failed'],
  failed: ['pending', 'paid'],
  paid: [],
  refunded: []
}

async function ownerOrder(clientId: number, number: number) {
  const o = await db('order').where({ number, client_id: clientId, deleted: false }).first()
  if (!o) throw new ApiError(404, 'Not found')
  return o
}

/** Creates a payment for an order unless it is paid. Used right after the order and for a retry. */
export async function startPayment(orderId: number): Promise<PaymentView | null> {
  const provider = getProvider()
  if (!provider) return null
  return db.transaction(async (trx) => {
    const o = await trx('order').where({ id: orderId }).forUpdate().first()
    if (!o) throw new ApiError(404, 'Not found')
    if (o.payment_state === 'paid' || o.payment_state === 'refunded') return toView(o, provider.isStub)
    // Pending payment of the same provider is kept: reload of the page does not create a second one.
    if (o.payment_state === 'pending' && o.payment_ref && o.payment_provider === provider.code) {
      return toView(o, provider.isStub)
    }
    const created = await provider.createPayment({
      orderNumber: o.number, amount: o.sum, description: `Заказ № ${o.number}`
    })
    await trx('order').where({ id: o.id }).update({
      payment_provider: provider.code, payment_ref: created.ref, payment_state: 'pending', paid_at: null
    })
    return toView({ ...o, payment_provider: provider.code, payment_ref: created.ref, payment_state: 'pending' }, provider.isStub, created.url)
  })
}

function toView(o: Record<string, any>, stub: boolean, url: string | null = null): PaymentView {
  const open = o.payment_state === 'pending' || o.payment_state === 'failed' || o.payment_state === 'not_paid'
  return {
    provider: o.payment_provider ?? null, state: o.payment_state, amount: o.sum,
    url: open && o.payment_provider ? url ?? (stub ? `/order/${o.number}/pay` : null) : null,
    ref: stub && o.payment_state === 'pending' ? o.payment_ref : null,
    stub
  }
}

/** Payment view for the owner of the order (client id comes from the visitor token). */
export async function getPaymentView(clientId: number, number: number): Promise<PaymentView> {
  const o = await ownerOrder(clientId, number)
  const p = o.payment_provider ? getProviderByCode(o.payment_provider) : null
  return toView(o, Boolean(p?.isStub))
}

/** Retry after a refusal (or when the page was lost): new payment, old reference stops working. */
export async function retryPayment(clientId: number, number: number): Promise<PaymentView> {
  assertPaymentAvailable()
  const o = await ownerOrder(clientId, number)
  if (o.payment_state === 'paid' || o.payment_state === 'refunded') return getPaymentView(clientId, number)
  const view = await startPayment(o.id)
  if (!view) throw new ApiError(409, 'Payment is not enabled')
  return view
}

export interface NotificationResult { state: PaymentState; changed: boolean; ignored: boolean }

/**
 * Applies a notification. Unknown or replaced reference: ignored. Same status again: no change.
 * `paid` is final; a reported amount that differs from the order sum is refused.
 */
export async function applyNotification(n: PaymentNotification): Promise<NotificationResult> {
  return db.transaction(async (trx) => {
    const o = await trx('order').where({ payment_ref: n.ref }).forUpdate().first()
    if (!o) return { state: 'not_paid', changed: false, ignored: true }
    const current = o.payment_state as PaymentState
    if (n.amount !== undefined && n.amount !== o.sum) throw new ApiError(409, 'Amount does not match the order')
    if (current === (n.status as string) || !NEXT[current].includes(n.status)) {
      return { state: current, changed: false, ignored: current !== (n.status as string) }
    }
    await trx('order').where({ id: o.id }).update({
      payment_state: n.status, paid_at: n.status === 'paid' ? trx.fn.now() : null
    })
    return { state: n.status, changed: true, ignored: false }
  })
}

/** Entry point of POST /payments/:provider/notify. */
export async function handleNotification(providerCode: string, req: import('express').Request): Promise<NotificationResult> {
  const provider = getProviderByCode(providerCode)
  if (!provider) throw new ApiError(404, 'Not found')
  const n = await provider.parseNotification(req)
  return applyNotification(n)
}
