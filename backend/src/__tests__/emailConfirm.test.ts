import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import request from 'supertest'
import { createApp } from '../app'
import { db } from '../db'
import { expirePending, MAX_SENDS } from '../services/emailConfirm'
import { MailMessage, setMailSender } from '../services/mail'
import { Catalog, createCatalog, createTariffs, createUser, dropCatalog, dropClients, dropTariffs, TEST_PASSWORD, tag, Tariffs } from '../testing/fixtures'
import { hashToken } from '../utils/visitor'

const app = createApp()
const prefix = tag()
let cat: Catalog
let tariffs: Tariffs
let userId = 0
const tokens: string[] = []
const sent: MailMessage[] = []
let savedManager: string | null = null
const saved = { provider: process.env.PAYMENT_PROVIDER }
const mailOf = (n: number) => `${prefix}-${n}@example.com`
const managerTo = `m-${prefix}@example.com`

const contact = (e_mail: string) => ({
  name: 'Иван', city: tariffs.city, phone: '89990000004', e_mail,
  address_delivery: true, delivery_address: 'Москва, ул. Тестовая, 1', consent: true
})

/** New visitor with an order placed from the given address. */
async function place(e_mail: string) {
  const v = request.agent(app)
  const r = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 1 }).expect(200)
  tokens.push(([] as string[]).concat(r.headers['set-cookie']).find((c) => c.startsWith('rc_client='))!.split(';')[0].slice(10))
  const order = (await v.post('/api/orders').send(contact(e_mail)).expect(201)).body.order
  return { v, order }
}

/** Token from the last mail with a link sent to the address. */
function linkToken(to: string): string {
  const m = [...sent].reverse().find((x) => x.to === to && x.html.includes('/order/confirm/'))!
  return m.html.match(/\/order\/confirm\/([A-Za-z0-9_-]+)/)![1]
}
const row = (number: number) => db('order').where({ number }).first()
const confirm = (token: string) => request(app).post('/api/orders/confirm').send({ token })

beforeAll(async () => {
  cat = await createCatalog(prefix)
  tariffs = await createTariffs(prefix)
  userId = (await createUser(prefix, 'admin')).id
  savedManager = (await db('setting').where({ code: 'mail.manager.to' }).first('value'))?.value ?? null
  await db('setting').where({ code: 'mail.manager.to' }).update({ value: managerTo })
  process.env.PAYMENT_PROVIDER = 'stub'
})
beforeEach(() => { sent.length = 0; setMailSender(async (m) => { sent.push(m) }) })
afterAll(async () => {
  setMailSender(null)
  process.env.PAYMENT_PROVIDER = saved.provider
  await db('setting').where({ code: 'mail.manager.to' }).update({ value: savedManager })
  const ids = tokens.length ? await db('client').whereIn('tokenHash', tokens.map(hashToken)).pluck('id') : []
  await dropClients(ids)
  await db('user').where({ id: userId }).delete()
  await dropCatalog(cat)
  await dropTariffs(tariffs)
  await db.destroy()
})

describe('e-mail confirmation of an order', () => {
  it('holds payment, the manager mail and the order mail until the link is opened', async () => {
    const { v, order } = await place(mailOf(1))
    expect(order).toMatchObject({ email_confirm: 'pending', payment: null })
    // Only the mail with the link goes out, to the buyer; the link carries a token, the database only its hash.
    expect(sent.map((m) => m.to)).toEqual([mailOf(1)])
    const token = linkToken(mailOf(1))
    const o = await row(order.number)
    expect(o.confirm_hash).toBe(hashToken(token))
    expect(o.confirm_hash).not.toContain(token)
    expect(o.manager_sent_at).toBeNull()
    expect(o.confirmation_sent_at).toBeNull()
    await v.post(`/api/orders/${order.number}/payment`).expect(409)
    expect((await v.get(`/api/orders/${order.number}`)).body.order.payment.url).toBeNull()

    sent.length = 0
    const res = await confirm(token).expect(200)
    expect(res.body).toEqual({ status: 'confirmed' })
    const after = (await v.get(`/api/orders/${order.number}`)).body.order
    expect(after).toMatchObject({ email_confirm: 'confirmed', payment: { state: 'pending' } })
    expect(sent.map((m) => m.to).sort()).toEqual([mailOf(1), managerTo].sort())
    expect(await row(order.number)).toMatchObject({ email_confirmed_by: 'link' })
    // The same link again changes nothing and sends nothing.
    sent.length = 0
    await confirm(token).expect(200)
    expect(sent).toHaveLength(0)
  })

  it('remembers the confirmed address: the next order is confirmed at once', async () => {
    const first = await place(mailOf(2))
    await confirm(linkToken(mailOf(2))).expect(200)
    expect(await db('confirmed_email').where({ e_mail: mailOf(2) }).first()).toBeTruthy()
    sent.length = 0
    const second = await place(mailOf(2).toUpperCase())
    expect(second.order).toMatchObject({ email_confirm: 'confirmed', payment: { state: 'pending' } })
    expect((await row(second.order.number)).email_confirmed_by).toBe('known')
    expect(sent.some((m) => m.to === managerTo)).toBe(true)
    expect(first.order.number).not.toBe(second.order.number)
    // After 30 days the address has to be confirmed again.
    await db('confirmed_email').where({ e_mail: mailOf(2) }).update({ expires_at: new Date(Date.now() - 1000) })
    expect((await place(mailOf(2))).order.email_confirm).toBe('pending')
  })

  it('refuses unknown and malformed tokens', async () => {
    expect((await confirm('x'.repeat(43)).expect(200)).body).toEqual({ status: 'invalid' })
    expect((await confirm('short').expect(200)).body).toEqual({ status: 'invalid' })
    await request(app).post('/api/orders/confirm').send({}).expect(400)
  })

  it('cancels an order not confirmed in 24 hours and blocks everything for it', async () => {
    const { v, order } = await place(mailOf(3))
    const token = linkToken(mailOf(3))
    await db('order').where({ number: order.number }).update({ confirm_expires_at: new Date(Date.now() - 1000) })
    expect(await expirePending()).toBeGreaterThan(0)
    expect(await row(order.number)).toMatchObject({ email_confirm_status: 'expired', confirm_hash: null })
    expect((await confirm(token).expect(200)).body).toEqual({ status: 'invalid' })
    expect((await v.get(`/api/orders/${order.number}`)).body.order.email_confirm).toBe('expired')
    await v.post(`/api/orders/${order.number}/confirm/resend`).expect(409)
    await v.post(`/api/orders/${order.number}/payment`).expect(409)
  })

  it('answers expired for a link opened after the 24 hours before the job has run', async () => {
    const { order } = await place(mailOf(4))
    await db('order').where({ number: order.number }).update({ confirm_expires_at: new Date(Date.now() - 1000) })
    expect((await confirm(linkToken(mailOf(4))).expect(200)).body).toEqual({ status: 'expired' })
    expect((await row(order.number)).email_confirm_status).toBe('expired')
  })

  it('resends with a new link (old one dies), once a minute, at most three times', async () => {
    const { v, order } = await place(mailOf(5))
    const old = linkToken(mailOf(5))
    await v.post(`/api/orders/${order.number}/confirm/resend`).expect(429) // less than a minute since the first mail
    const back = () => db('order').where({ number: order.number }).update({ confirm_sent_at: new Date(Date.now() - 120_000) })
    await back()
    await v.post(`/api/orders/${order.number}/confirm/resend`).expect(200)
    const fresh = linkToken(mailOf(5))
    expect(fresh).not.toBe(old)
    expect((await confirm(old).expect(200)).body).toEqual({ status: 'invalid' })
    for (let i = 2; i < MAX_SENDS; i++) {
      await back()
      await v.post(`/api/orders/${order.number}/confirm/resend`).expect(200)
    }
    await back()
    await v.post(`/api/orders/${order.number}/confirm/resend`).expect(429)
    expect((await row(order.number)).confirm_sends).toBe(MAX_SENDS)
    // A stranger cannot resend.
    await request(app).post(`/api/orders/${order.number}/confirm/resend`).expect(404)
  })

  it('changes the address of a pending order and sends the link there', async () => {
    const { v, order } = await place(mailOf(6))
    await db('order').where({ number: order.number }).update({ confirm_sent_at: new Date(Date.now() - 120_000) })
    await v.post(`/api/orders/${order.number}/confirm/email`).send({ e_mail: 'bad' }).expect(400)
    await v.post(`/api/orders/${order.number}/confirm/email`).send({ e_mail: mailOf(7) }).expect(200)
    expect((await row(order.number)).e_mail).toBe(mailOf(7))
    await confirm(linkToken(mailOf(7))).expect(200)
    expect(await db('confirmed_email').where({ e_mail: mailOf(7) }).first()).toBeTruthy()
    // A confirmed order cannot change the address this way.
    await v.post(`/api/orders/${order.number}/confirm/email`).send({ e_mail: mailOf(8) }).expect(409)
  })

  it('lets the manager confirm in the CMS (right orders), without remembering the address', async () => {
    const { order } = await place(mailOf(9))
    const a = request.agent(app)
    await a.post('/api/cms/login').send({ login: `${prefix}-admin`, password: TEST_PASSWORD }).expect(200)
    const id = (await row(order.number)).id
    const list = (await a.get(`/api/cms/tables/order?number=${order.number}`).expect(200)).body.rows[0]
    expect(list.state).toBe('Ждёт подтверждения почты')
    expect(list.confirm_hash).toBeUndefined()
    await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(409)
    sent.length = 0
    const res = await a.post(`/api/cms/tables/order/${id}/confirm`).expect(200)
    expect(res.body.row).toMatchObject({ email_confirm_status: 'confirmed', email_confirmed_by: 'manager' })
    expect(sent.map((m) => m.to).sort()).toEqual([mailOf(9), managerTo].sort())
    expect(await db('confirmed_email').where({ e_mail: mailOf(9) }).first()).toBeUndefined()
    await a.post(`/api/cms/tables/order/${id}/confirm`).expect(409)
    await request(app).post(`/api/cms/tables/order/${id}/confirm`).expect(401)
  })

  it('does not send the tracking mail while the address is not confirmed', async () => {
    const { order } = await place(mailOf(10))
    const a = request.agent(app)
    await a.post('/api/cms/login').send({ login: `${prefix}-admin`, password: TEST_PASSWORD }).expect(200)
    const id = (await row(order.number)).id
    sent.length = 0
    await a.patch(`/api/cms/tables/order/${id}`).send({ delivery_reference: 'TRK-PENDING' }).expect(200)
    expect(sent).toHaveLength(0)
  })
})
