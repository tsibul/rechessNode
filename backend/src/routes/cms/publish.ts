/**
 * Site rebuild trigger and journal.
 * @module routes/cms/publish
 */
import { Router } from 'express'
import { requireAuth, requirePermission } from '../../middleware/cmsAuth'
import { ApiError } from '../../middleware/error'
import { getPublication, listPublications, startPublication } from '../../services/publish'
import { wrap } from '../../utils/async'

/**
 * CMS routes that start a site build and show the publication journal.
 */
export const cmsPublishRouter = Router()
cmsPublishRouter.use(requireAuth, requirePermission('publish'))

cmsPublishRouter.post('/publish', wrap(async (req, res) => {
  res.status(202).json({ publication: await startPublication(req.cmsUser!.id) })
}))

cmsPublishRouter.get('/publications', wrap(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  res.json({ publications: await listPublications(limit) })
}))

cmsPublishRouter.get('/publications/:id', wrap(async (req, res) => {
  const id = Number(req.params.id)
  const row = Number.isInteger(id) ? await getPublication(id) : null
  if (!row) throw new ApiError(404, 'Not found')
  res.json({ publication: row })
}))
