/**
 * In-memory request rate limiter for public routes (fixed window per client IP).
 * One process only; behind a proxy the IP comes from `trust proxy`.
 * @module middleware/rateLimit
 */
import type { NextFunction, Request, Response } from 'express'

/**
 * Options of {@link rateLimit}.
 */
export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number
  /** Requests allowed per window and IP. */
  max: number
  /** Apply the limit under NODE_ENV=test too (the suites share one IP and would hit it). */
  inTest?: boolean
  /** Counting key; default is the client IP. Returning undefined skips the limit for the request. */
  key?: (req: Request) => string | undefined
}

/**
 * Creates a fixed-window rate limiting middleware; answers 429 with `Retry-After` when exceeded.
 * @param options - Limit configuration.
 * @param options.windowMs - Window length in milliseconds.
 * @param options.max - Requests allowed per window and key.
 * @param options.inTest - Apply the limit under `NODE_ENV=test` too.
 * @param options.key - Counting key; default is the client IP.
 * @returns Express middleware.
 */
export function rateLimit({ windowMs, max, inTest = false, key: keyOf }: RateLimitOptions) {
  const hits = new Map<string, { count: number; reset: number }>()
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test' && !inTest) return next()
    const now = Date.now()
    if (hits.size > 10000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
    const key = keyOf ? keyOf(req) : req.ip || 'unknown'
    if (key === undefined) return next()
    let h = hits.get(key)
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs }
      hits.set(key, h)
    }
    h.count++
    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - h.count)))
    if (h.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)))
      return res.status(429).json({ error: 'Too many requests, try later' })
    }
    next()
  }
}

/** Reads of the public API. */
export const publicReadLimit = rateLimit({ windowMs: 60_000, max: 300 })
/** Cart changes. */
export const cartWriteLimit = rateLimit({ windowMs: 60_000, max: 60 })
/** Order creation: a person places few orders. */
export const orderLimit = rateLimit({ windowMs: 10 * 60_000, max: 10 })
/** Order confirmations go to the address typed by the buyer; one address gets few of them per hour. */
export const orderEmailLimit = rateLimit({
  windowMs: 60 * 60_000, max: 5,
  key: (req) => (typeof req.body?.e_mail === 'string' ? `mail|${req.body.e_mail.trim().toLowerCase()}` : undefined)
})
