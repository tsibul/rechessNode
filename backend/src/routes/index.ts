/**
 * Main router of the reChess API. Contract: docs/API.md.
 * @module routes
 */
import { Router } from 'express'
import { publicRouter } from './public'
import { shopRouter } from './shop'
import { cmsAuthRouter } from './cms/auth'
import { cmsTablesRouter } from './cms/tables'
import { cmsRolesRouter } from './cms/roles'
import { cmsUploadsRouter } from './cms/uploads'
import { cmsPublishRouter } from './cms/publish'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

router.use('/', publicRouter)
router.use('/', shopRouter)

const cms = Router()
cms.use('/', cmsAuthRouter)
cms.use('/tables', cmsTablesRouter)
cms.use('/roles', cmsRolesRouter)
cms.use('/uploads', cmsUploadsRouter)
cms.use('/', cmsPublishRouter)
router.use('/cms', cms)

router.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})
