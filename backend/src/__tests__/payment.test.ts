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
const saved = { provider: process.env.PAYMENT_PROVIDER, env: process.env.NODE_ENV }

const contact = (over: Record<string, unknown> = {}) => ({
  name: 'Иван', city: `${prefix}-city`, phone: '8 (999) 000-00-02', e_mail: `${prefix}@example.com`,
  address_delivery: true, delivery_address: 'Москва, ул. Тестовая, 1', consent: true, ...over
})

/** New visitor with one pair in the cart. */
async function buyer() {
  const v = request.agent(app)
  const res = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 2 }).expect(200)
  const c = ([] as string[]).concat(res.headers['set-cookie']).find((x) => x.startsWith('rc_client='))!
  tokens.push(c.split(';')[0].slice('rc_client='.length))
  return v
}

async function placeOrder() {
  const v = await buyer()
  const res = await v.post('/api/orders').send(contact()).expect(201)
  return { v, order: res.body.order, payment: res.body.order.payment }
}

const notify = (ref: string, result: string) => request(app).post('/api/payments/stub/notify').send({ ref, result })

beforeAll(async () => {
  cat = await createCatalog(prefix)
  await rememberEmails(`${prefix}@example.com`)
  tariffs = await createTariffs(prefix)
})

beforeEach(() => { process.env.PAYMENT_PROVIDER = 'stub' })

afterAll(async () => {
  process.env.PAYMENT_PROVIDER = saved.provider
  const ids = tokens.length ? await db('client').whereIn('tokenHash', tokens.map(hashToken)).pluck('id') : []
  await dropClients(ids)
  await dropCatalog(cat)
  await dropTariffs(tariffs)
  await db.destroy()
})

describe('payment stub', () => {
  it('starts a pending payment with the sum taken from the server', async () => {
    const v = await buyer()
    const res = await v.post('/api/orders').send({ ...contact(), sum: 1, amount: 1 }).expect(400) // client money fields are refused
    expect(res.body.error).toBeDefined()
    const ok = await v.post('/api/orders').send(contact()).expect(201)
    const { order } = ok.body
    expect(order.payment_state).toBe('pending')
    expect(order.payment).toMatchObject({ provider: 'stub', state: 'pending', amount: order.sum, stub: true, url: `/order/${order.number}/pay` })
    expect(order.payment.ref).toMatch(/^stub_/)
    const row = await db('order').where({ number: order.number }).first()
    expect(row).toMatchObject({ payment_state: 'pending', payment_provider: 'stub', payment_ref: order.payment.ref })
  })

  it('paid is final and a repeated notification changes nothing', async () => {
    const { v, order, payment } = await placeOrder()
    const first = await notify(payment.ref, 'paid').expect(200)
    expect(first.body).toEqual({ state: 'paid', changed: true })
    const paidAt = (await db('order').where({ number: order.number }).first()).paid_at
    expect(paidAt).toBeTruthy()
    const again = await notify(payment.ref, 'paid').expect(200)
    expect(again.body).toEqual({ state: 'paid', changed: false })
    // a late refusal does not undo the payment
    const late = await notify(payment.ref, 'failed').expect(200)
    expect(late.body).toEqual({ state: 'paid', changed: false })
    const row = await db('order').where({ number: order.number }).first()
    expect(row.payment_state).toBe('paid')
    expect(new Date(row.paid_at).getTime()).toBe(new Date(paidAt).getTime())
    const view = await v.get(`/api/orders/${order.number}`).expect(200)
    expect(view.body.order).toMatchObject({ payment_state: 'paid', payment: { state: 'paid', url: null, ref: null } })
  })

  it('a refusal can be repeated: retry makes a new payment, the old reference is dead', async () => {
    const { v, order, payment } = await placeOrder()
    expect((await notify(payment.ref, 'failed').expect(200)).body).toEqual({ state: 'failed', changed: true })
    expect((await notify(payment.ref, 'failed').expect(200)).body).toEqual({ state: 'failed', changed: false })
    const retry = await v.post(`/api/orders/${order.number}/payment`).expect(200)
    expect(retry.body.payment).toMatchObject({ state: 'pending', amount: order.sum })
    expect(retry.body.payment.ref).not.toBe(payment.ref)
    // retry of a pending payment keeps the same reference
    const same = await v.post(`/api/orders/${order.number}/payment`).expect(200)
    expect(same.body.payment.ref).toBe(retry.body.payment.ref)
    // the old reference no longer changes the order
    const old = await notify(payment.ref, 'paid').expect(200)
    expect(old.body.changed).toBe(false)
    expect((await db('order').where({ number: order.number }).first()).payment_state).toBe('pending')
    expect((await notify(retry.body.payment.ref, 'paid').expect(200)).body).toEqual({ state: 'paid', changed: true })
    // retry after payment does not reopen it
    const done = await v.post(`/api/orders/${order.number}/payment`).expect(200)
    expect(done.body.payment).toMatchObject({ state: 'paid', url: null })
  })

  it('refuses a bad notification and a stranger', async () => {
    const { order, payment } = await placeOrder()
    await notify(payment.ref, 'refunded').expect(400)
    await request(app).post('/api/payments/stub/notify').send({ ref: payment.ref }).expect(400)
    expect((await notify('stub_unknown_reference', 'paid').expect(200)).body.changed).toBe(false)
    await request(app).post('/api/payments/nope/notify').send({}).expect(404)
    const stranger = request.agent(app)
    await stranger.get(`/api/orders/${order.number}/payment`).expect(404)
    await stranger.post(`/api/orders/${order.number}/payment`).expect(404)
  })

  it('without a provider the order stays unpaid and has no payment', async () => {
    process.env.PAYMENT_PROVIDER = ''
    const { order, payment } = await placeOrder()
    expect(order.payment_state).toBe('not_paid')
    expect(payment).toBeNull()
  })
})

describe('production', () => {
  afterEach(() => { process.env.NODE_ENV = saved.env })

  it.each(['stub', 'none', ''])('does not take an order with PAYMENT_PROVIDER=%p and creates nothing', async (provider) => {
    process.env.PAYMENT_PROVIDER = provider
    const v = await buyer()
    const before = Number((await db('order').count({ c: '*' }).first())?.c)
    process.env.NODE_ENV = 'production'
    const res = await v.post('/api/orders').send(contact())
    process.env.NODE_ENV = saved.env
    expect(res.status).toBe(503)
    expect(res.body.error).toMatch(/Оплата временно недоступна/)
    expect(Number((await db('order').count({ c: '*' }).first())?.c)).toBe(before)
    // the cart is untouched: the buyer can order later
    expect((await v.get('/api/cart').expect(200)).body.count).toBe(2)
  })

  it('refuses stub notifications', async () => {
    const { payment } = await placeOrder()
    process.env.NODE_ENV = 'production'
    const res = await notify(payment.ref, 'paid')
    process.env.NODE_ENV = saved.env
    expect(res.status).toBe(403)
    expect((await db('order').where({ payment_ref: payment.ref }).first()).payment_state).toBe('pending')
  })
})
