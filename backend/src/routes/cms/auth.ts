/**
 * CMS login, logout, current user.
 * @module routes/cms/auth
 */
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db'
import { CMS_COOKIE, clearSession, issueSession, loadCmsUser, readToken, requireAuth, revokeSessions, sessionStamp } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { wrap } from '../../utils/async'
import { notDeleted } from '../../utils/db'
import { hashPassword, verifyPassword } from '../../utils/password'

export const cmsAuthRouter = Router()

const MAX_FAILS = 5
/** Failed logins from one address across all logins (guessing many accounts). */
const MAX_FAILS_PER_IP = 20
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { count: number; first: number }>()

/** Drops expired counters, so the map does not grow without bound. */
function sweep(now: number): void {
  if (fails.size < 1000) return
  for (const [k, v] of fails) if (now - v.first > WINDOW_MS) fails.delete(k)
}

function failedCount(key: string, now: number): number {
  const rec = fails.get(key)
  if (rec && now - rec.first > WINDOW_MS) fails.delete(key)
  return fails.get(key)?.count ?? 0
}

function addFail(key: string, now: number): void {
  const f = fails.get(key) ?? { count: 0, first: now }
  f.count += 1
  fails.set(key, f)
}

/** Test hook: clears the failed-login counters. */
export function resetLoginThrottle(): void {
  fails.clear()
}

let dummyHash: Promise<string> | null = null

const loginSchema = z.object({ login: z.string().min(1).max(255), password: z.string().min(1).max(500) }).strict()

cmsAuthRouter.post('/login', wrap(async (req, res) => {
  const { login, password } = loginSchema.parse(req.body)
  const key = `${login.toLowerCase()}|${req.ip}`
  const ipKey = `ip|${req.ip}`
  const now = Date.now()
  sweep(now)
  if (failedCount(key, now) >= MAX_FAILS || failedCount(ipKey, now) >= MAX_FAILS_PER_IP) {
    throw new ApiError(429, 'Too many attempts, try later')
  }

  const user = await notDeleted(db('user').where({ login })).first()
  // Compare against a dummy hash for unknown logins so timing does not reveal them.
  dummyHash ??= hashPassword('dummy-password')
  const ok = user ? await verifyPassword(password, user.password) : (await verifyPassword(password, await dummyHash), false)
  const cms = ok ? await loadCmsUser(user.id) : null
  if (!cms) {
    addFail(key, now)
    addFail(ipKey, now)
    throw new ApiError(401, 'Invalid login or password')
  }
  fails.delete(key)
  issueSession(res, cms.id, sessionStamp(user))
  res.json({ user: cms })
}))

cmsAuthRouter.post('/logout', wrap(async (req, res) => {
  const token = req.cookies?.[CMS_COOKIE]
  const claims = typeof token === 'string' ? readToken(token) : null
  if (claims) await revokeSessions(claims.uid)
  clearSession(res)
  res.status(204).end()
}))

cmsAuthRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.cmsUser })
})
