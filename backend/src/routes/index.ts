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
import { cartWriteLimit, orderLimit, publicReadLimit } from '../middleware/rateLimit'

export const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Rate limits of the public routes (the CMS has its own login limit).
const publicPaths = ['/products', '/pages', '/settings', '/shops', '/index-photos', '/seller', '/site', '/cart', '/checkout', '/orders', '/payments']
router.use(publicPaths, publicReadLimit)
router.post(['/cart/items'], cartWriteLimit)
router.patch('/cart/items/:itemId', cartWriteLimit)
router.delete('/cart/items/:itemId', cartWriteLimit)
router.post('/orders', orderLimit)

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
