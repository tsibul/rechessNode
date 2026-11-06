/**
 * Stub provider: no money moves. The buyer presses "paid" or "declined" on a site page,
 * which sends a notification like a real service would. Refused in production (see ./index.ts).
 * @module services/payment/stub
 */
import { randomBytes } from 'crypto'
import type { Request } from 'express'
import { z } from 'zod'
import { db } from '../../db'
import { ApiError } from '../../middleware/error'
import type { PaymentNotification, PaymentProvider, PaymentStatus } from './types'

const body = z.object({ ref: z.string().min(8).max(64), result: z.enum(['paid', 'failed']) }).strict()

export const stubProvider: PaymentProvider = {
  code: 'stub',
  isStub: true,

  async createPayment(input) {
    const ref = `stub_${randomBytes(18).toString('hex')}`
    return { ref, url: `/order/${input.orderNumber}/pay` }
  },

  async getStatus(ref) {
    const row = await db('order').where({ payment_ref: ref }).first('payment_state')
    const s = row?.payment_state
    return (s === 'paid' || s === 'failed' ? s : 'pending') as PaymentStatus
  },

  async parseNotification(req: Request): Promise<PaymentNotification> {
    if (process.env.NODE_ENV === 'production') throw new ApiError(403, 'Stub payments are disabled')
    const b = body.parse(req.body)
    return { ref: b.ref, status: b.result }
  }
}
