import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import request from 'supertest'
import { createApp } from '../app'
import { db } from '../db'
import { Catalog, createCatalog, createTariffs, dropCatalog, dropClients, dropTariffs, tag, Tariffs, rememberEmails } from '../testing/fixtures'
import { hashToken } from '../utils/visitor'

const app = createApp()
const prefix = tag()
let cat: Catalog
let tariffs: Tariffs
const tokens: string[] = []

function tokenOf(res: request.Response): string | null {
  const c = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((x) => x.startsWith('rc_client='))
  return c ? c.split(';')[0].slice('rc_client='.length) : null
}

/** New visitor: agent that remembers cookies. */
function visitor() {
  return request.agent(app)
}

const contact = (over: Record<string, unknown> = {}) => ({
  name: 'Иван', family_name: 'Тестов', city: `${prefix}-city`, phone: '8 (999) 000-00-01',
  e_mail: `${prefix}@example.com`, address_delivery: true, delivery_address: 'Москва, ул. Тестовая, 1',
  comment: 'позвонить', consent: true, ...over
})

beforeAll(async () => {
  cat = await createCatalog(prefix)
  await rememberEmails(`${prefix}@example.com`)
  tariffs = await createTariffs(prefix)
})

afterAll(async () => {
  const ids = tokens.length ? await db('client').whereIn('tokenHash', tokens.map(hashToken)).pluck('id') : []
  await dropClients(ids)
  await dropCatalog(cat)
  await dropTariffs(tariffs)
  await db.destroy()
})

describe('cart', () => {
  it('is empty and creates nothing without a token', async () => {
    const before = Number((await db('client').count({ c: '*' }).first())?.c)
    const res = await request(app).get('/api/cart').expect(200)
    expect(res.body).toEqual({ items: [], count: 0, total: 0 })
    expect(res.headers['set-cookie']).toBeUndefined()
    expect(Number((await db('client').count({ c: '*' }).first())?.c)).toBe(before)
  })

  it('first add issues an HttpOnly token, stores only its hash, and prices from the backend', async () => {
    const v = visitor()
    const res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 2 }).expect(200)
    const token = tokenOf(res)!
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    tokens.push(token)
    const cookies = ([] as string[]).concat(res.headers['set-cookie'])
    expect(cookies.find((c) => c.startsWith('rc_client='))).toMatch(/HttpOnly/)
    const count = cookies.find((c) => c.startsWith('rc_cart_count='))!
    expect(count).toMatch(/^rc_cart_count=2;/)
    expect(count).not.toMatch(/HttpOnly/)
    expect(res.body.items).toEqual([expect.objectContaining({
      item_id: cat.itemIds[0], quantity: 2, price: 200, sum: 400, photo: `${prefix}.jpg`
    })])
    expect(res.body).toMatchObject({ count: 2, total: 400 })
    // the DB never holds the raw token
    expect(await db('client').where({ tokenHash: token }).first()).toBeUndefined()
    expect(await db('client').where({ tokenHash: hashToken(token) }).first()).toBeDefined()
  })

  it('ignores a client-supplied price', async () => {
    const v = visitor()
    const res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], price: 1 })
    expect(res.status).toBe(400)
  })

  it('adds up quantities, changes and removes lines', async () => {
    const v = visitor()
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    let res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 3 }).expect(200)
    expect(res.body.count).toBe(4)
    res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[1], quantity: 1 }).expect(200)
    expect(res.body.items).toHaveLength(2)
    res = await v.patch(`/api/cart/items/${cat.itemIds[0]}`).send({ quantity: 1 }).expect(200)
    expect(res.body).toMatchObject({ count: 2, total: 400 })
    res = await v.get('/api/cart').expect(200)
    expect(res.body.count).toBe(2)
    res = await v.delete(`/api/cart/items/${cat.itemIds[1]}`).expect(200)
    expect(res.body.items).toHaveLength(1)
    await v.delete(`/api/cart/items/${cat.itemIds[1]}`).expect(404)
    res = await v.patch(`/api/cart/items/${cat.itemIds[0]}`).send({ quantity: 0 }).expect(200)
    expect(res.body.items).toEqual([])
    // This visitor's cart (the database is shared: the newest cart overall may belong to someone else).
    const client = await db('client').where({ tokenHash: hashToken(tokens[tokens.length - 1]) }).first('id')
    const cart = await db('cart').where({ client_id: client.id }).orderBy('id', 'desc').first()
    expect(cart.sum).toBe(0)
  })

  it('caps quantity and validates input', async () => {
    const v = visitor()
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 99 }).expect(200))!)
    const res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 5 }).expect(200)
    expect(res.body.count).toBe(99)
    await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 100 }).expect(400)
    await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 0 }).expect(400)
    await v.post('/api/cart/items').send({ item_id: 'x' }).expect(400)
    await v.post('/api/cart/items').send({ item_id: 999999999 }).expect(404)
  })

  it('rejects deleted pairs and treats a forged token as no cart', async () => {
    await db('item').where({ id: cat.itemIds[1] }).update({ deleted: true })
    await request(app).post('/api/cart/items').send({ item_id: cat.itemIds[1] }).expect(404)
    await db('item').where({ id: cat.itemIds[1] }).update({ deleted: false })
    const forged = 'a'.repeat(64)
    const res = await request(app).get('/api/cart').set('Cookie', `rc_client=${forged}`).expect(200)
    expect(res.body.count).toBe(0)
    await request(app).patch(`/api/cart/items/${cat.itemIds[0]}`).set('Cookie', `rc_client=${forged}`).send({ quantity: 1 }).expect(404)
  })

  it('uses the new price after a price change', async () => {
    const v = visitor()
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 1 }).expect(200))!)
    const [priceId] = await db('price').insert({ product_id: cat.productId, price: 250, price_date: '2023-01-01 00:00:00', deleted: false })
    try {
      const res = await v.get('/api/cart').expect(200)
      expect(res.body.total).toBe(250)
    } finally {
      await db('price').where({ id: priceId }).delete()
    }
  })
})

describe('orders', () => {
  it('rejects an empty cart and a missing token', async () => {
    const r = await request(app).post('/api/orders').send(contact()).expect(400)
    expect(r.body.error).toBe('Cart is empty')
  })

  it('validates the body', async () => {
    const v = visitor()
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    await v.post('/api/orders').send(contact({ consent: false })).expect(400)
    await v.post('/api/orders').send(contact({ phone: '123' })).expect(400)
    await v.post('/api/orders').send(contact({ e_mail: 'nope' })).expect(400)
    await v.post('/api/orders').send(contact({ address_delivery: false })).expect(400) // pickup needs a code
    await v.post('/api/orders').send(contact({ name: '' })).expect(400)
    await v.post('/api/orders').send(contact({ sum: 1 })).expect(400) // unknown field
    expect(await db('order').where({ e_mail: `${prefix}@example.com` }).first()).toBeUndefined()
  })

  it('creates an order from the cart with backend prices and closes the cart', async () => {
    const v = visitor()
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 2 }).expect(200))!)
    await v.post('/api/cart/items').send({ item_id: cat.itemIds[1], quantity: 1 }).expect(200)
    await db('setting').where({ code: 'legal.consent_version' }).update({ value: `v-${prefix}` })
    const res = await v.post('/api/orders').send(contact()).expect(201)
    await db('setting').where({ code: 'legal.consent_version' }).update({ value: null })
    const o = res.body.order
    expect(o).toMatchObject({
      sum: 850, delivery_cost: 250, payment_state: 'not_paid', phone: '+79990000001',
      address_delivery: true, delivery_point_code: null, comment: 'позвонить', delivery_reference: null
    })
    expect(o.number).toBeGreaterThan(1000)
    expect(o.items.map((i: any) => [i.quantity, i.price, i.sum])).toEqual([[2, 200, 400], [1, 200, 200]])
    expect(typeof o.state).toBe('string')

    const row = await db('order').where({ number: o.number }).first()
    expect(row.consent_version).toBe(`v-${prefix}`)
    expect(row.consent_at).toBeTruthy()
    const lowest = await db('order_state').where('deleted', 0).orderBy('priority').first()
    expect(row.order_state_id).toBe(lowest.id)

    const cart = await v.get('/api/cart').expect(200)
    expect(cart.body.count).toBe(0)
    expect(cart.headers['set-cookie']).toBeUndefined()
    await v.post('/api/orders').send(contact()).expect(400) // cart is closed
  })

  it('prefills the next checkout and keeps the order snapshot', async () => {
    const v = visitor()
    expect((await v.get('/api/checkout/prefill').expect(200)).body).toEqual({ contact: null })
    tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    const first = await v.post('/api/orders').send(contact({ address_delivery: false, delivery_point_code: 'MSK123', delivery_address: 'ПВЗ 1' })).expect(201)
    expect(first.body.order).toMatchObject({ address_delivery: false, delivery_point_code: 'MSK123' })
    const pre = await v.get('/api/checkout/prefill').expect(200)
    expect(pre.body.contact).toMatchObject({ name: 'Иван', phone: '+79990000001', delivery_point_code: 'MSK123' })

    await v.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200)
    const second = await v.post('/api/orders').send(contact({ name: 'Пётр' })).expect(201)
    expect(second.body.order.number).toBeGreaterThan(first.body.order.number)
    const reread = await v.get(`/api/orders/${first.body.order.number}`).expect(200)
    expect(reread.body.order.name).toBe('Иван') // snapshot survives the client update
  })

  it('shows an order only to its owner', async () => {
    const owner = visitor()
    tokens.push(tokenOf(await owner.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    const { body } = await owner.post('/api/orders').send(contact()).expect(201)
    await owner.get(`/api/orders/${body.order.number}`).expect(200)
    const other = visitor()
    tokens.push(tokenOf(await other.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    await other.get(`/api/orders/${body.order.number}`).expect(404)
    await request(app).get(`/api/orders/${body.order.number}`).expect(404)
    await owner.get('/api/orders/abc').expect(404)
  })

  it('gives parallel orders distinct numbers', async () => {
    const vs = [visitor(), visitor(), visitor()]
    for (const v of vs) tokens.push(tokenOf(await v.post('/api/cart/items').send({ item_id: cat.itemIds[0] }).expect(200))!)
    const results = await Promise.all(vs.map((v) => v.post('/api/orders').send(contact())))
    expect(results.map((r) => r.status)).toEqual([201, 201, 201])
    expect(new Set(results.map((r) => r.body.order.number)).size).toBe(3)
  })
})
