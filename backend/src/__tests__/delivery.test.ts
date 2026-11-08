import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import fs from 'fs'
import request from 'supertest'
import { createApp } from '../app'
import { db } from '../db'
import { quoteDelivery } from '../services/delivery'
import { fill, MailMessage, outboxDir, setMailSender, trackingUrl } from '../services/mail'
import {
  Catalog, createCatalog, createTariffs, createUser, dropCatalog, dropClients, dropTariffs, tag, TEST_PASSWORD, Tariffs, rememberEmails } from '../testing/fixtures'
import { hashToken } from '../utils/visitor'

import os from 'os'
import sharp from 'sharp'

const uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rechess-mail-'))
process.env.UPLOAD_DIR = uploadRoot
const app = createApp()
const prefix = tag()
let cat: Catalog
let tariffs: Tariffs
let userId: number
const tokens: string[] = []
const sent: MailMessage[] = []

async function cms() {
  const a = request.agent(app)
  await a.post('/api/cms/login').send({ login: `${prefix}-admin`, password: TEST_PASSWORD }).expect(200)
  return a
}

function tokenOf(res: request.Response): string {
  const c = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((x) => x.startsWith('rc_client='))!
  return c.split(';')[0].slice('rc_client='.length)
}

const contact = (over: Record<string, unknown> = {}) => ({
  name: 'Иван <b>', city: tariffs.city.toUpperCase(), phone: '89990000003', e_mail: `${prefix}@example.com`,
  address_delivery: true, delivery_address: 'Москва, ул. 1', consent: true, ...over
})

async function buyer(quantity = 1) {
  const v = request.agent(app)
  const r = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity }).expect(200)
  tokens.push(tokenOf(r))
  return v
}

beforeAll(async () => {
  cat = await createCatalog(prefix)
  await rememberEmails(`${prefix}@example.com`, `${prefix}-file@example.com`, `${prefix}-img@example.com`)
  tariffs = await createTariffs(prefix)
  await db('product').where({ id: cat.productId }).update({ weight_g: 600 })
  userId = (await createUser(prefix, 'admin')).id
  await sharp({ create: { width: 400, height: 300, channels: 3, background: '#a00' } }).jpeg().toFile(path.join(uploadRoot, `${prefix}.jpg`))
})

beforeEach(() => {
  sent.length = 0
  setMailSender(async (m) => { sent.push(m) })
})

afterAll(async () => {
  setMailSender(null)
  fs.rmSync(uploadRoot, { recursive: true, force: true })
  const ids = tokens.length ? await db('client').whereIn('tokenHash', tokens.map(hashToken)).pluck('id') : []
  await dropClients(ids)
  await db('user').where({ id: userId }).delete()
  await dropCatalog(cat)
  await dropTariffs(tariffs)
  await db.destroy()
})

describe('tariff choice', () => {
  it('takes the city tariff by weight, case and ё insensitive', async () => {
    expect((await quoteDelivery(true, tariffs.city, 600))?.cost).toBe(250)
    expect((await quoteDelivery(true, ` ${tariffs.city.toUpperCase()} `, 1000))?.cost).toBe(250)
    expect((await quoteDelivery(true, tariffs.city, 1001))?.cost).toBe(400)
    expect((await quoteDelivery(false, tariffs.city, 0))?.cost).toBe(150)
    expect((await quoteDelivery(false, tariffs.city, 5000))?.cost).toBe(300)
  })

  it('falls back to the any-city tariff and returns null when nothing fits', async () => {
    const other = await quoteDelivery(true, `${prefix}-nowhere`, 100)
    expect(other).not.toBeNull()
    expect(other!.tariff_id).not.toBeNull()
    await db.transaction(async (trx) => {
      await trx('delivery_tariff').whereNull('city').delete()
      expect(await quoteDelivery(true, `${prefix}-nowhere`, 100, trx)).toBeNull()
      expect((await quoteDelivery(true, tariffs.city, 100, trx))?.cost).toBe(250)
      await trx.rollback()
    }).catch((e) => { if (!/Transaction rejected/.test(String(e?.message ?? e))) throw e })
  })

  it('ignores deleted tariffs', async () => {
    await db('delivery_tariff').where({ id: tariffs.ids[0] }).update({ deleted: true })
    expect((await quoteDelivery(true, tariffs.city, 100))?.cost).toBe(400)
    await db('delivery_tariff').where({ id: tariffs.ids[0] }).update({ deleted: false })
  })
})

describe('checkout', () => {
  it('offers both methods for the cart weight', async () => {
    const v = await buyer(1)
    let r = await v.get(`/api/checkout/delivery?city=${encodeURIComponent(tariffs.city)}`).expect(200)
    expect(r.body).toMatchObject({ weight_g: 600, door: { cost: 250 }, pickup: { cost: 150 } })
    await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 1 }).expect(200)
    r = await v.get(`/api/checkout/delivery?city=${encodeURIComponent(tariffs.city)}`).expect(200)
    expect(r.body).toMatchObject({ weight_g: 1200, door: { cost: 400 }, pickup: { cost: 300 } })
    expect((await request(app).get('/api/checkout/delivery').expect(200)).body.weight_g).toBe(0)
  })

  it('adds the server-calculated delivery to the sum and stores weight and tariff', async () => {
    const v = await buyer(2) // 2 x 200 + door heavy 400
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    expect(body.order).toMatchObject({ sum: 800, delivery_cost: 400, tracking_url: null })
    const row = await db('order').where({ number: body.order.number }).first()
    expect(row).toMatchObject({ weight_g: 1200, delivery_tariff_id: tariffs.ids[1], delivery_cost: 400 })
  })

  it('takes the pickup tariff and ignores a delivery_cost sent by the client', async () => {
    const v = await buyer(1)
    await v.post('/api/orders').send(contact({ address_delivery: false, delivery_cost: 1 })).expect(400)
    const { body } = await v.post('/api/orders').send(contact({ address_delivery: false, delivery_point_code: 'MSK123' })).expect(201)
    expect(body.order).toMatchObject({ sum: 350, delivery_cost: 150 })
  })

  it('requires the city and a valid point code', async () => {
    const v = await buyer(1)
    await v.post('/api/orders').send(contact({ city: '' })).expect(400)
    await v.post('/api/orders').send(contact({ city: undefined })).expect(400)
    await v.post('/api/orders').send(contact({ address_delivery: false, delivery_point_code: "x'; --" })).expect(400)
  })
})

describe('mail', () => {
  it('sends the confirmation, escapes buyer text and marks the order', async () => {
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    const mine = sent.filter((m) => m.to === `${prefix}@example.com`)
    expect(mine).toHaveLength(1)
    expect(mine[0].subject).toContain(String(body.order.number))
    expect(mine[0].html).toContain('Иван &lt;b&gt;')
    expect(mine[0].html).not.toContain('Иван <b>')
    expect(mine[0].text).toContain(`${body.order.number}`)
    const row = await db('order').where({ number: body.order.number }).first()
    expect(row.confirmation_sent_at).toBeTruthy()
    expect(row.confirmation_error).toBeNull()
  })

  it('does not fail the order when the mail fails, and stores the error', async () => {
    setMailSender(async () => { throw new Error('smtp down') })
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    const row = await db('order').where({ number: body.order.number }).first()
    expect(row.confirmation_sent_at).toBeNull()
    expect(row.confirmation_error).toBe('smtp down')
  })

  it('writes an .eml file when no SMTP is configured', async () => {
    setMailSender(null)
    const v = await buyer(1)
    await v.post('/api/orders').send(contact({ e_mail: `${prefix}-file@example.com` })).expect(201)
    const files = fs.readdirSync(outboxDir()).filter((f) => f.includes(`${prefix}-file@example.com`))
    expect(files).toHaveLength(1)
    const eml = fs.readFileSync(path.join(outboxDir(), files[0]), 'utf8')
    expect(eml).toMatch(/^From: /m)
    expect(eml).toMatch(/Subject: /)
  })

  it('shows the product name and embeds the item photo in the mail without a public site', async () => {
    const v = await buyer(1)
    await v.post('/api/orders').send(contact()).expect(201)
    const html = sent[0].html
    expect(html).toContain('cid:item-')
    expect(html).not.toMatch(/src="https?:/)
    expect(sent[0].attachments).toHaveLength(1)
    const thumb = sent[0].attachments![0]
    expect(html).toContain(`cid:${thumb.cid}`)
    expect(thumb.content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true)
    expect((await sharp(thumb.content).metadata()).width).toBe(160)
    const name = (await db('product').where({ id: cat.productId }).first('name')).name.split('\n')[0]
    expect(html).toContain(name.replace(/&/g, '&amp;'))
  })

  it('writes the photo into the .eml as an inline part', async () => {
    setMailSender(null)
    const v = await buyer(1)
    await v.post('/api/orders').send(contact({ e_mail: `${prefix}-img@example.com` })).expect(201)
    const file = fs.readdirSync(outboxDir()).find((f) => f.includes(`${prefix}-img@example.com`))!
    const eml = fs.readFileSync(path.join(outboxDir(), file), 'utf8')
    expect(eml).toMatch(/Content-Type: multipart\/related/)
    expect(eml).toMatch(/Content-ID: <item-\d+@rechess>/)
    expect(eml).toMatch(/Content-Type: image\/jpeg/)
  })

  it('fills templates and builds the tracking link', () => {
    expect(fill('a {{x}} {{ y }} {{z}}', { x: '1', y: '2' })).toBe('a 1 2 ')
    expect(trackingUrl('https://t.example/?id={{track}}', 'A B')).toBe('https://t.example/?id=A%20B')
    expect(trackingUrl('', 'A')).toBeNull()
    expect(trackingUrl('https://t.example/{{track}}', null)).toBeNull()
  })
})

describe('tracking number in the CMS', () => {
  it('mails the track once, again only when it changes, and resends on request', async () => {
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    sent.length = 0
    const a = await cms()
    const id = (await db('order').where({ number: body.order.number }).first('id')).id

    await a.patch(`/api/cms/tables/order/${id}`).send({ comment: 'x' }).expect(200)
    expect(sent).toHaveLength(0)

    const r1 = await a.patch(`/api/cms/tables/order/${id}`).send({ delivery_reference: ' 1234567890 ' }).expect(200)
    expect(r1.body.row).toMatchObject({ delivery_reference: '1234567890', track_error: null })
    expect(r1.body.row.track_sent_at).toBeTruthy()
    expect(sent).toHaveLength(1)
    expect(sent[0].html).toContain('1234567890')
    expect(sent[0].html).toContain('cdek.ru')
    expect(sent[0].text).toContain('cdek.ru')
    expect((await v.get(`/api/orders/${body.order.number}`).expect(200)).body.order.tracking_url).toContain('1234567890')

    await a.patch(`/api/cms/tables/order/${id}`).send({ delivery_reference: '1234567890' }).expect(200)
    expect(sent).toHaveLength(1)
    await a.patch(`/api/cms/tables/order/${id}`).send({ delivery_reference: '999' }).expect(200)
    expect(sent).toHaveLength(2)

    const again = await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(200)
    expect(again.body.ok).toBe(true)
    expect(sent).toHaveLength(3)
    await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'confirmation' }).expect(200)
    await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'bogus' }).expect(400)
  })

  it('keeps the update when the mail fails', async () => {
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    const a = await cms()
    const id = (await db('order').where({ number: body.order.number }).first('id')).id
    setMailSender(async () => { throw new Error('boom') })
    const r = await a.patch(`/api/cms/tables/order/${id}`).send({ delivery_reference: 'T1' }).expect(200)
    expect(r.body.row).toMatchObject({ delivery_reference: 'T1', track_error: 'boom', track_sent_at: null })
    await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(200)
    setMailSender(async (m) => { sent.push(m) })
    const ok = await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(200)
    expect(ok.body.row).toMatchObject({ track_error: null })
  })

  it('refuses a track mail for an order without a number and anonymous access', async () => {
    const a = await cms()
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    const id = (await db('order').where({ number: body.order.number }).first('id')).id
    await a.post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(400)
    await request(app).post(`/api/cms/tables/order/${id}/send-mail`).send({ kind: 'track' }).expect(401)
  })

  it('edits tariffs with the prices right and rejects bad values', async () => {
    const a = await cms()
    const created = await a.post('/api/cms/tables/delivery_tariff').send({
      name: `${prefix} cms`, address_delivery: true, city: `${prefix}-cms`, weight_to: null, price: 77, priority: 5
    }).expect(201)
    tariffs.ids.push(created.body.row.id)
    expect(await quoteDelivery(true, `${prefix}-cms`, 10)).toMatchObject({ cost: 77 })
    await a.post('/api/cms/tables/delivery_tariff').send({ name: 'x', address_delivery: true, price: -1, priority: 1 }).expect(400)
    await a.patch(`/api/cms/tables/delivery_tariff/${created.body.row.id}`).send({ price: 88 }).expect(200)
    expect((await quoteDelivery(true, `${prefix}-cms`, 10))?.cost).toBe(88)
    await a.patch(`/api/cms/tables/product/${cat.productId}`).send({ weight_g: 700, length_mm: 300, width_mm: 300, height_mm: 60 }).expect(200)
    expect(await db('product').where({ id: cat.productId }).first()).toMatchObject({ weight_g: 700, length_mm: 300 })
  })
})

describe('mail to the managers and order statuses', () => {
  const codes = ['mail.manager.to', 'mail.manager.subject', 'mail.manager.body']
  let saved: Record<string, string | null> = {}

  beforeAll(async () => {
    const rows = await db('setting').whereIn('code', codes).select('code', 'value')
    saved = Object.fromEntries(rows.map((r) => [r.code, r.value]))
  })
  afterEach(async () => {
    for (const c of codes) await db('setting').where({ code: c }).update({ value: saved[c] ?? null })
  })

  const setTo = (v: string) => db('setting').where({ code: 'mail.manager.to' }).update({ value: v })

  it('sends one mail to all managers with items, sum, buyer, delivery and the CMS link', async () => {
    await setTo(`a-${prefix}@example.com, b-${prefix}@example.com;`)
    const v = await buyer(2)
    const { body } = await v.post('/api/orders').send(contact({ name: 'Пётр', comment: 'позвоните <утром>' })).expect(201)
    const row = await db('order').where({ number: body.order.number }).first()
    const m = sent.find((x) => x.to.includes(`a-${prefix}@`))!
    expect(m.to).toBe(`a-${prefix}@example.com, b-${prefix}@example.com`)
    expect(m.subject).toContain(`№ ${body.order.number}`)
    expect(m.html).toContain('+79990000003')
    expect(m.html).toContain(`${prefix}@example.com`)
    expect(m.html).toContain('Москва, ул. 1')
    expect(m.html).toContain('× 2')
    expect(m.html).toContain('позвоните &lt;утром&gt;')
    expect(m.html).toContain(`/cms#orders/${row.id}`)
    expect(row.manager_error).toBeNull()
    expect(row.manager_sent_at).not.toBeNull()
    expect(sent.filter((x) => x.to === `${prefix}@example.com`)).toHaveLength(1) // buyer mail is separate
  })

  it('does not fail the order and stores the error when there are no addresses or the send fails', async () => {
    await setTo('')
    let v = await buyer(1)
    let { body } = await v.post('/api/orders').send(contact()).expect(201)
    expect((await db('order').where({ number: body.order.number }).first()).manager_error).toContain('Не заданы адреса')
    await setTo(`m-${prefix}@example.com`)
    setMailSender(async (m) => { if (m.to.startsWith('m-')) throw new Error('smtp down'); sent.push(m) })
    v = await buyer(1)
    ;({ body } = await v.post('/api/orders').send(contact()).expect(201))
    const row = await db('order').where({ number: body.order.number }).first()
    expect(row.manager_error).toBe('smtp down')
    expect(row.confirmation_error).toBeNull()
    const a = await cms()
    setMailSender(async (m) => { sent.push(m) })
    const r = await a.post(`/api/cms/tables/order/${row.id}/send-mail`).send({ kind: 'manager' }).expect(200)
    expect(r.body.row).toMatchObject({ manager_error: null })
  })

  it('takes the subject and text from the settings and keeps the addresses out of the public API', async () => {
    await setTo(`t-${prefix}@example.com`)
    await db('setting').where({ code: 'mail.manager.subject' }).update({ value: 'Заказ {{number}} ({{name}})' })
    await db('setting').where({ code: 'mail.manager.body' }).update({ value: '<p>Только {{sum}}</p>' })
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact({ name: 'Ольга' })).expect(201)
    const m = sent.find((x) => x.to === `t-${prefix}@example.com`)!
    expect(m.subject).toBe(`Заказ ${body.order.number} (Ольга)`)
    expect(m.text).toContain('Только')
    const pub = await request(app).get('/api/settings').expect(200)
    expect(pub.body.settings).not.toHaveProperty('mail.manager.to')
  })

  it('counts orders by status for the CMS filter', async () => {
    const a = await cms()
    const before = (await a.get('/api/cms/tables/order/state-counts').expect(200)).body
    const v = await buyer(1)
    const { body } = await v.post('/api/orders').send(contact()).expect(201)
    const after = (await a.get('/api/cms/tables/order/state-counts').expect(200)).body
    expect(after.total).toBe(before.total + 1)
    const row = await db('order').where({ number: body.order.number }).first()
    const sc = (s: any, id: number) => s.states.find((x: any) => x.id === id)?.count ?? 0
    expect(sc(after, row.order_state_id)).toBe(sc(before, row.order_state_id) + 1)
    const other = after.states.find((s: any) => s.id !== row.order_state_id)
    await a.patch(`/api/cms/tables/order/${row.id}`).send({ order_state_id: other.id }).expect(200)
    const moved = (await a.get('/api/cms/tables/order/state-counts').expect(200)).body
    expect(sc(moved, other.id)).toBe(sc(after, other.id) + 1)
    const list = (await a.get(`/api/cms/tables/order?order_state_id=${other.id}&limit=100`).expect(200)).body
    expect(list.rows.some((r: any) => r.id === row.id)).toBe(true)
    await request(app).get('/api/cms/tables/order/state-counts').expect(401)
  })
})
