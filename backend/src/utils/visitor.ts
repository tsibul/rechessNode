/**
 * Anonymous visitor token: random token in an HttpOnly cookie, SHA-256 in client.tokenHash.
 * Not a login. See docs/API.md.
 * @module utils/visitor
 */
import { createHash, randomBytes } from 'crypto'
import type { Request, Response } from 'express'

export const CLIENT_COOKIE = 'rc_client'
export const COUNT_COOKIE = 'rc_cart_count'
const YEAR_MS = 365 * 24 * 3600 * 1000

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken(): string {
  return randomBytes(32).toString('hex')
}

export function readToken(req: Request): string | null {
  const t = req.cookies?.[CLIENT_COOKIE]
  return typeof t === 'string' && /^[0-9a-f]{64}$/.test(t) ? t : null
}

export function setClientCookie(res: Response, token: string): void {
  res.cookie(CLIENT_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR_MS
  })
}

export function setCountCookie(res: Response, count: number): void {
  res.cookie(COUNT_COOKIE, String(count), {
    httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR_MS
  })
}
