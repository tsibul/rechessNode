/**
 * Contract of a payment provider. A real service is a new implementation of this interface
 * registered in `./index.ts`; the order code does not change.
 * @module services/payment/types
 */
import type { Request } from 'express'

export type PaymentStatus = 'pending' | 'paid' | 'failed'

export interface CreatePaymentInput {
  orderNumber: number
  /** Whole roubles, always taken from the order in the database. */
  amount: number
  description: string
}

export interface CreatedPayment {
  /** Reference of the payment at the provider (unique). */
  ref: string
  /** Where the buyer pays: a site path (stub) or an external URL. */
  url: string
}

export interface PaymentNotification {
  ref: string
  status: PaymentStatus
  /** If the provider reports the amount, it is compared with the order. */
  amount?: number
}

export interface PaymentProvider {
  readonly code: string
  /** The stub moves no money and must never run in production. */
  readonly isStub: boolean
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>
  /** Current status at the provider (polling when no notification came). */
  getStatus(ref: string): Promise<PaymentStatus>
  /** Checks and parses an incoming notification; throws ApiError(400/403) for a bad one. */
  parseNotification(req: Request): Promise<PaymentNotification>
}
