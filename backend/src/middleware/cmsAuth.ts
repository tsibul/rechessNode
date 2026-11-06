/**
 * CMS session: JWT in an HttpOnly cookie; user, role and permissions are re-read from the
 * database on every request, so role changes and deletions apply at once.
 * @module middleware/cmsAuth
 */
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { db } from '../db'
import { notDeleted } from '../utils/db'
import { ApiError } from './error'

export const CMS_COOKIE = 'rc_cms'
const SESSION_HOURS = 12

export const PERMISSIONS = [
  'orders', 'clients', 'carts', 'references', 'prices', 'seo', 'pages', 'settings', 'users', 'publish'
] as const
export type Permission = typeof PERMISSIONS[number]

export interface CmsUser {
  id: number
  name: string
  login: string
  role: { id: number; code: string; name: string }
  permissions: string[]
}

declare module 'express-serve-static-core' {
  interface Request {
    cmsUser?: CmsUser
  }
}

function secret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return s
}

export function issueSession(res: Response, userId: number): void {
  const token = jwt.sign({ uid: userId }, secret(), { expiresIn: `${SESSION_HOURS}h` })
  res.cookie(CMS_COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 3600 * 1000
  })
}

export function clearSession(res: Response): void {
  res.clearCookie(CMS_COOKIE, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' })
}

export async function loadCmsUser(userId: number): Promise<CmsUser | null> {
  const user = await notDeleted(db('user').where({ id: userId })).first()
  if (!user) return null
  const role = await notDeleted(db('role').where({ id: user.role_id })).first()
  if (!role) return null
  const perms = await db('role_permission').where({ role_id: role.id }).pluck('permission')
  return {
    id: user.id, name: user.name, login: user.login,
    role: { id: role.id, code: role.code, name: role.name },
    permissions: perms
  }
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[CMS_COOKIE]
  if (typeof token !== 'string') return next(new ApiError(401, 'Unauthorized'))
  let uid: number
  try {
    const payload = jwt.verify(token, secret()) as { uid?: unknown }
    if (typeof payload.uid !== 'number') throw new Error('bad payload')
    uid = payload.uid
  } catch {
    return next(new ApiError(401, 'Unauthorized'))
  }
  loadCmsUser(uid).then((user) => {
    if (!user) return next(new ApiError(401, 'Unauthorized'))
    req.cmsUser = user
    next()
  }, next)
}

/** Allows the request if the user holds at least one of the permissions. */
export function requirePermission(...allowed: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const have = req.cmsUser?.permissions ?? []
    if (!allowed.some((p) => have.includes(p))) return next(new ApiError(403, 'Forbidden'))
    next()
  }
}
