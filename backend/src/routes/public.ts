/**
 * Public read-only routes: catalogue, price, pages, settings, shops.
 * @module routes/public
 */
import { Router } from 'express'
import { ApiError } from '../middleware/error'
import {
  currentPrice, getIndexPhotos, getPages, getProducts, getSeller, getSettings, getShops
} from '../services/catalog'
import { wrap } from '../utils/async'
import { db } from '../db'
import { notDeleted } from '../utils/db'

/**
 * Public read-only routes: catalog, pages, settings, shops and delivery data.
 */
export const publicRouter = Router()

publicRouter.get('/products', wrap(async (_req, res) => {
  res.json({ products: await getProducts() })
}))

publicRouter.get('/products/:id/price', wrap(async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) throw new ApiError(404, 'Not found')
  const exists = await notDeleted(db('product').where({ id })).first('id')
  const price = exists ? await currentPrice(id) : null
  if (price === null) throw new ApiError(404, 'Not found')
  res.json({ product_id: id, price })
}))

publicRouter.get('/pages', wrap(async (_req, res) => {
  const pages = await getPages()
  res.json({ pages: pages.map((p) => ({ slug: p.slug, name: p.name, seo: p.seo })) })
}))

publicRouter.get('/pages/:slug', wrap(async (req, res) => {
  const [page] = await getPages(req.params.slug)
  if (!page) throw new ApiError(404, 'Not found')
  res.json(page)
}))

publicRouter.get('/settings', wrap(async (_req, res) => {
  res.json({ settings: await getSettings() })
}))

publicRouter.get('/shops', wrap(async (_req, res) => {
  res.json({ shops: await getShops() })
}))

publicRouter.get('/index-photos', wrap(async (_req, res) => {
  res.json({ photos: await getIndexPhotos() })
}))

publicRouter.get('/seller', wrap(async (_req, res) => {
  res.json({ seller: await getSeller() })
}))

publicRouter.get('/site', wrap(async (_req, res) => {
  const [settings, pages, products, shops, index_photos, seller] = await Promise.all([
    getSettings(), getPages(), getProducts(), getShops(), getIndexPhotos(), getSeller()
  ])
  res.json({ settings, pages, products, shops, index_photos, seller })
}))
