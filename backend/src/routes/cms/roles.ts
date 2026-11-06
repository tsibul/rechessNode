/**
 * Role permissions editor.
 * @module routes/cms/roles
 */
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../../db'
import { PERMISSIONS, requireAuth, requirePermission } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { wrap } from '../../utils/async'
import { notDeleted } from '../../utils/db'

export const cmsRolesRouter = Router()
cmsRolesRouter.use(requireAuth, requirePermission('users'))

async function roleView(id: number) {
  const role = await db('role').where({ id }).first()
  if (!role) return null
  const permissions = await db('role_permission').where({ role_id: id }).orderBy('permission').pluck('permission')
  return { id: role.id, code: role.code, name: role.name, permissions }
}

cmsRolesRouter.get('/', wrap(async (_req, res) => {
  const roles = await notDeleted(db('role')).orderBy('id')
  const perms = await db('role_permission').select('role_id', 'permission').orderBy('permission')
  res.json({
    roles: roles.map((r) => ({
      id: r.id, code: r.code, name: r.name,
      permissions: perms.filter((p) => p.role_id === r.id).map((p) => p.permission)
    }))
  })
}))

cmsRolesRouter.put('/:id/permissions', wrap(async (req, res) => {
  const id = Number(req.params.id)
  const body = z.object({ permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length) }).strict().parse(req.body)
  const permissions = [...new Set(body.permissions)]
  const role = Number.isInteger(id) ? await roleView(id) : null
  if (!role) throw new ApiError(404, 'Not found')
  if (role.code === 'admin' && !permissions.includes('users')) {
    throw new ApiError(400, 'Admin role must keep the users permission')
  }
  await db.transaction(async (trx) => {
    await trx('role_permission').where({ role_id: id }).delete()
    if (permissions.length) await trx('role_permission').insert(permissions.map((permission) => ({ role_id: id, permission })))
  })
  res.json({ role: await roleView(id) })
}))
