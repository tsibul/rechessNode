/**
 * Anonymous visitor token: random token in an HttpOnly cookie, SHA-256 in client.tokenHash.
 * Not a login. See docs/API.md.
 * @module utils/visitor
 */
import { createHash, randomBytes } from 'crypto'
import type { Request, Response } from 'express'

/**
 * Name of the cookie holding the visitor token.
 */
export const CLIENT_COOKIE = 'rc_client'
/**
 * Name of the cookie holding the cart item count for the site header.
 */
export const COUNT_COOKIE = 'rc_cart_count'
const YEAR_MS = 365 * 24 * 3600 * 1000

/**
 * Hashes a visitor token for storage.
 * @param token - Raw token.
 * @returns SHA-256 hex digest.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Creates a new random visitor token.
 * @returns Random token string.
 */
export function newToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Reads the visitor token from the request cookies.
 * @param req - Request.
 * @returns The token, or null.
 */
export function readToken(req: Request): string | null {
  const t = req.cookies?.[CLIENT_COOKIE]
  return typeof t === 'string' && /^[0-9a-f]{64}$/.test(t) ? t : null
}

/**
 * Sets the visitor token cookie for a year.
 * @param res - Response.
 * @param token - Raw token.
 */
export function setClientCookie(res: Response, token: string): void {
  res.cookie(CLIENT_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR_MS
  })
}

/**
 * Sets the cart count cookie.
 * @param res - Response.
 * @param count - Number of items in the cart.
 */
export function setCountCookie(res: Response, count: number): void {
  res.cookie(COUNT_COOKIE, String(count), {
    httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR_MS
  })
}
