import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import request from 'supertest'
import { createApp } from '../app'
import { db } from '../db'
import { Catalog, createCatalog, dropCatalog, tag } from '../testing/fixtures'

const app = createApp()
const prefix = tag()
let cat: Catalog
let pageId: number
let shopId: number
const slug = `slug-${prefix}`
const settingCode = `test.${prefix}`

beforeAll(async () => {
  cat = await createCatalog(prefix)
  ;[pageId] = await db('page').insert({ slug, name: `Page ${prefix}`, deleted: false })
  await db('page_block').insert([
    { page_id: pageId, code: 'b2', priority: 20, content: JSON.stringify({ n: 2 }), deleted: false },
    { page_id: pageId, code: 'b1', priority: 10, content: JSON.stringify({ n: 1 }), deleted: false },
    { page_id: pageId, code: 'gone', priority: 5, content: '{}', deleted: true }
  ])
  await db('seo').insert({ page_id: pageId, title: 'T', description: 'D', robots_index: false, deleted: false })
  await db('setting').insert([
    { code: settingCode, name: 'n', type: 'number', value: '42', priority: 1, deleted: false },
    { code: `${settingCode}.b`, name: 'n', type: 'boolean', value: 'true', priority: 2, deleted: false },
    { code: `${settingCode}.e`, name: 'n', type: 'text', value: '', priority: 3, deleted: false }
  ])
  ;[shopId] = await db('shops').insert({ name: `Shop ${prefix}`, address: 'addr', working_hours: '10-20', deleted: false })
  await db('shop_photo').insert({ name: 'ph', priority: 1, photo: 'x.jpg', shop_id: shopId, deleted: false })
})

afterAll(async () => {
  await db('shop_photo').where({ shop_id: shopId }).delete()
  await db('shops').where({ id: shopId }).delete()
  await db('setting').where('code', 'like', `${settingCode}%`).delete()
  await db('seo').where({ page_id: pageId }).delete()
  await db('page_block').where({ page_id: pageId }).delete()
  await db('page').where({ id: pageId }).delete()
  await dropCatalog(cat)
  await db.destroy()
})

describe('GET /api/products', () => {
  it('returns the product with the current price and pairs', async () => {
    const res = await request(app).get('/api/products').expect(200)
    const p = res.body.products.find((x: any) => x.id === cat.productId)
    expect(p.price).toBe(200) // past 200 wins over future 300 and deleted 400
    expect(p.items).toHaveLength(2)
    expect(p.items[0].article).toMatch(/^A\d{1}B\d{1}$/)
    expect(p.items[0].main_color.hex).toBe('112233')
    expect(p.items[0].photos).toEqual([{ name: 'p', photo: `${prefix}.jpg` }])
    expect(p.items[1].photos).toEqual([])
  })

  it('hides deleted pairs and products', async () => {
    await db('item').where({ id: cat.itemIds[1] }).update({ deleted: true })
    let res = await request(app).get('/api/products').expect(200)
    expect(res.body.products.find((x: any) => x.id === cat.productId).items).toHaveLength(1)
    await db('item').where({ id: cat.itemIds[1] }).update({ deleted: false })
    await db('product').where({ id: cat.productId }).update({ deleted: true })
    res = await request(app).get('/api/products').expect(200)
    expect(res.body.products.find((x: any) => x.id === cat.productId)).toBeUndefined()
    await db('product').where({ id: cat.productId }).update({ deleted: false })
  })
})

describe('GET /api/products/:id/price', () => {
  it('returns the current price', async () => {
    const res = await request(app).get(`/api/products/${cat.productId}/price`).expect(200)
    expect(res.body).toEqual({ product_id: cat.productId, price: 200 })
  })

  it('follows a price change', async () => {
    await db('price').where({ id: cat.priceIds[1] }).update({ deleted: true })
    const res = await request(app).get(`/api/products/${cat.productId}/price`).expect(200)
    expect(res.body.price).toBe(100)
    await db('price').where({ id: cat.priceIds[1] }).update({ deleted: false })
  })

  it('404 for unknown product and bad id', async () => {
    await request(app).get('/api/products/999999999/price').expect(404)
    await request(app).get('/api/products/abc/price').expect(404)
  })
})

describe('pages', () => {
  it('returns a page with ordered blocks and seo', async () => {
    const res = await request(app).get(`/api/pages/${slug}`).expect(200)
    expect(res.body.blocks.map((b: any) => b.code)).toEqual(['b1', 'b2'])
    expect(res.body.blocks[0].content).toEqual({ n: 1 })
    expect(res.body.seo).toMatchObject({ title: 'T', description: 'D', robots_index: false, og_title: null })
  })

  it('lists pages and 404s on an unknown slug', async () => {
    const res = await request(app).get('/api/pages').expect(200)
    expect(res.body.pages.some((p: any) => p.slug === slug)).toBe(true)
    await request(app).get('/api/pages/no-such-page').expect(404)
  })
})

describe('settings, shops, site', () => {
  it('casts setting values by type', async () => {
    const res = await request(app).get('/api/settings').expect(200)
    expect(res.body.settings[settingCode]).toBe(42)
    expect(res.body.settings[`${settingCode}.b`]).toBe(true)
    expect(res.body.settings[`${settingCode}.e`]).toBeNull()
  })

  it('returns shops with photos', async () => {
    const res = await request(app).get('/api/shops').expect(200)
    const s = res.body.shops.find((x: any) => x.id === shopId)
    expect(s.working_hours).toBe('10-20')
    expect(s.photos).toEqual([{ name: 'ph', photo: 'x.jpg' }])
  })

  it('returns seller and index photos shapes', async () => {
    const a = await request(app).get('/api/seller').expect(200)
    expect(a.body).toHaveProperty('seller')
    const b = await request(app).get('/api/index-photos').expect(200)
    expect(Array.isArray(b.body.photos)).toBe(true)
  })

  it('aggregates everything for the build', async () => {
    const res = await request(app).get('/api/site').expect(200)
    expect(Object.keys(res.body).sort()).toEqual(['index_photos', 'pages', 'products', 'seller', 'settings', 'shops'])
    expect(res.body.pages.some((p: any) => p.slug === slug)).toBe(true)
  })
})

describe('misc', () => {
  it('health and unknown routes', async () => {
    await request(app).get('/api/health').expect(200)
    await request(app).get('/api/nothing').expect(404)
    await request(app).post('/api/auth/client/token').send({}).expect(404)
  })
})
