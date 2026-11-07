/**
 * Choice of the payment provider by `PAYMENT_PROVIDER` in `.env`.
 *   (empty) / none  no payment step: the order is only registered (as before stage 11)
 *   stub            stub with a confirmation page, development and tests only
 * A real service is added to `providers` and selected by its code.
 * In production only a real provider is accepted: see `assertPaymentAvailable`.
 * @module services/payment
 */
import { ApiError } from '../../middleware/error'
import { stubProvider } from './stub'
import type { PaymentProvider } from './types'

const providers: Record<string, PaymentProvider> = {
  [stubProvider.code]: stubProvider
}

/**
 * Message shown when no payment provider can accept payments.
 */
export const PAYMENT_UNAVAILABLE = 'Оплата временно недоступна, заказ не принят. Попробуйте позже или свяжитесь с нами.'

const configured = () => (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase()

/** The provider in use, or null when orders are taken without a payment step. */
export function getProvider(): PaymentProvider | null {
  const code = configured()
  if (!code || code === 'none') return null
  const p = providers[code]
  if (!p) throw new ApiError(500, `Unknown PAYMENT_PROVIDER "${code}"`)
  return p
}

/**
 * Looks up a provider by its code.
 * @param code - Provider code.
 * @returns The provider, or null when unknown.
 */
export function getProviderByCode(code: string): PaymentProvider | null {
  return providers[code] ?? null
}

/**
 * Called before an order is created. Production without a real provider (unset, none, stub)
 * refuses the order with a clear error, so nothing is created that cannot be paid.
 */
export function assertPaymentAvailable(): void {
  if (process.env.NODE_ENV !== 'production') return
  const code = configured()
  const p = providers[code]
  if (!p || p.isStub) throw new ApiError(503, PAYMENT_UNAVAILABLE)
}
