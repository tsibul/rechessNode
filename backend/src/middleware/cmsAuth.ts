/**
 * CMS session: JWT in an HttpOnly cookie; user, role and permissions are re-read from the
 * database on every request, so role changes and deletions apply at once.
 * @module middleware/cmsAuth
 */
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { db } from '../db'
import { notDeleted } from '../utils/db'
import { ApiError } from './error'

/**
 * Name of the CMS session cookie.
 */
export const CMS_COOKIE = 'rc_cms'
const SESSION_HOURS = 12

/**
 * Permission codes a CMS role can grant.
 */
export const PERMISSIONS = [
  'orders', 'clients', 'carts', 'references', 'prices', 'seo', 'pages', 'settings', 'users', 'publish'
] as const
/**
 * One of {@link PERMISSIONS}.
 */
export type Permission = typeof PERMISSIONS[number]

/**
 * The authenticated CMS user attached to the request.
 */
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

/**
 * Session stamp: `user.hashToken` (a legacy nullable column, unused otherwise) holds a random value that
 * every token carries. Replacing it (logout, password change) revokes all tokens of the user at once.
 */
export function sessionStamp(user: { hashToken?: string | null }): string {
  return user.hashToken ?? ''
}

/**
 * Invalidates every session of a user by rotating the stored session stamp.
 * @param userId - CMS user id.
 */
export async function revokeSessions(userId: number): Promise<void> {
  await db('user').where({ id: userId }).update({ hashToken: crypto.randomBytes(24).toString('hex') })
}

/**
 * Signs a session token and sets it as an httpOnly cookie.
 * @param res - Response to set the cookie on.
 * @param userId - CMS user id.
 * @param stamp - Current session stamp of the user.
 */
export function issueSession(res: Response, userId: number, stamp: string): void {
  const token = jwt.sign({ uid: userId, sv: stamp }, secret(), { algorithm: 'HS256', expiresIn: `${SESSION_HOURS}h` })
  res.cookie(CMS_COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 3600 * 1000
  })
}

/**
 * Removes the CMS session cookie.
 * @param res - Response to clear the cookie on.
 */
export function clearSession(res: Response): void {
  res.clearCookie(CMS_COOKIE, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' })
}

/** With `stamp`, a token issued before the last revocation gets no user. */
export async function loadCmsUser(userId: number, stamp?: string): Promise<CmsUser | null> {
  const user = await notDeleted(db('user').where({ id: userId })).first()
  if (!user) return null
  if (stamp !== undefined && stamp !== sessionStamp(user)) return null
  const role = await notDeleted(db('role').where({ id: user.role_id })).first()
  if (!role) return null
  const perms = await db('role_permission').where({ role_id: role.id }).pluck('permission')
  return {
    id: user.id, name: user.name, login: user.login,
    role: { id: role.id, code: role.code, name: role.name },
    permissions: perms
  }
}

/**
 * Verifies a session token.
 * @param token - JWT from the session cookie.
 * @returns The token payload, or null when it is invalid or expired.
 */
export function readToken(token: string): { uid: number; sv: string } | null {
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ['HS256'] }) as { uid?: unknown; sv?: unknown }
    if (typeof payload.uid !== 'number' || typeof payload.sv !== 'string') return null
    return { uid: payload.uid, sv: payload.sv }
  } catch {
    return null
  }
}

/**
 * Middleware that requires a valid CMS session and loads the user into `req.cmsUser`; answers 401 otherwise.
 */
export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[CMS_COOKIE]
  if (typeof token !== 'string') return next(new ApiError(401, 'Unauthorized'))
  const claims = readToken(token)
  if (!claims) return next(new ApiError(401, 'Unauthorized'))
  loadCmsUser(claims.uid, claims.sv).then((user) => {
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
