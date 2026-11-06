/**
 * CMS login, logout, current user.
 * @module routes/cms/auth
 */
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db'
import { clearSession, issueSession, loadCmsUser, requireAuth } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { wrap } from '../../utils/async'
import { notDeleted } from '../../utils/db'
import { hashPassword, verifyPassword } from '../../utils/password'

export const cmsAuthRouter = Router()

const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { count: number; first: number }>()

/** Test hook: clears the failed-login counters. */
export function resetLoginThrottle(): void {
  fails.clear()
}

let dummyHash: Promise<string> | null = null

const loginSchema = z.object({ login: z.string().min(1).max(255), password: z.string().min(1).max(500) }).strict()

cmsAuthRouter.post('/login', wrap(async (req, res) => {
  const { login, password } = loginSchema.parse(req.body)
  const key = `${login.toLowerCase()}|${req.ip}`
  const now = Date.now()
  const rec = fails.get(key)
  if (rec && now - rec.first > WINDOW_MS) fails.delete(key)
  const cur = fails.get(key)
  if (cur && cur.count >= MAX_FAILS) throw new ApiError(429, 'Too many attempts, try later')

  const user = await notDeleted(db('user').where({ login })).first()
  // Compare against a dummy hash for unknown logins so timing does not reveal them.
  dummyHash ??= hashPassword('dummy-password')
  const ok = user ? await verifyPassword(password, user.password) : (await verifyPassword(password, await dummyHash), false)
  const cms = ok ? await loadCmsUser(user.id) : null
  if (!cms) {
    const f = fails.get(key) ?? { count: 0, first: now }
    f.count += 1
    fails.set(key, f)
    throw new ApiError(401, 'Invalid login or password')
  }
  fails.delete(key)
  issueSession(res, cms.id)
  res.json({ user: cms })
}))

cmsAuthRouter.post('/logout', (_req, res) => {
  clearSession(res)
  res.status(204).end()
})

cmsAuthRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.cmsUser })
})
