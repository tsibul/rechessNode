import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../../.env') })

import fsSync, { promises as fs } from 'fs'
import os from 'os'
import request from 'supertest'
import { createApp } from '../app'
import { db } from '../db'
import { PERMISSIONS } from '../middleware/cmsAuth'
import { resetLoginThrottle } from '../routes/cms/auth'
import { setPublishRunner, shellRunner, waitForIdle } from '../services/publish'
import { Catalog, createCatalog, createUser, dropCatalog, dropClients, tag, TEST_PASSWORD } from '../testing/fixtures'
import { hashToken } from '../utils/visitor'

const uploadRoot = fsSync.mkdtempSync(path.join(os.tmpdir(), 'rc-up-'))
process.env.UPLOAD_DIR = uploadRoot
const app = createApp()
const prefix = tag()
let cat: Catalog
const roleIds: number[] = []
const userIds: number[] = []
const extraIds: Record<string, number[]> = { page: [], page_block: [], setting: [], color: [], role: [], user: [] }
const clientTokens: string[] = []

async function makeRole(code: string, permissions: string[]) {
  const [id] = await db('role').insert({ code: `${prefix}-${code}`, name: `${prefix} ${code}`, deleted: false })
  roleIds.push(id)
  if (permissions.length) await db('role_permission').insert(permissions.map((permission) => ({ role_id: id, permission })))
  return `${prefix}-${code}`
}

async function login(roleSuffix: string, expected = 200) {
  const agent = request.agent(app)
  const res = await agent.post('/api/cms/login').send({ login: `${prefix}-${prefix}-${roleSuffix}`, password: TEST_PASSWORD })
  expect(res.status).toBe(expected)
  return agent
}

beforeAll(async () => {
  cat = await createCatalog(prefix)
  for (const [suffix, perms] of [
    ['none', []], ['orders', ['orders']], ['refs', ['references']], ['pub', ['publish']],
    ['all', [...PERMISSIONS]], ['seo', ['seo']], ['prices', ['prices']]
  ] as [string, string[]][]) {
    const code = await makeRole(suffix, perms)
    userIds.push((await createUser(prefix, code)).id)
  }
})

beforeEach(() => resetLoginThrottle())

afterAll(async () => {
  await db('publication').whereIn('started_by', userIds).delete()
  for (const t of ['page_block', 'page', 'setting', 'color', 'user'] as const) {
    if (extraIds[t].length) await db(t).whereIn('id', extraIds[t]).delete()
  }
  const cids = clientTokens.length ? await db('client').whereIn('tokenHash', clientTokens.map(hashToken)).pluck('id') : []
  await dropClients(cids)
  await db('user').whereIn('id', userIds).delete()
  if (extraIds.role.length) await db('role').whereIn('id', extraIds.role).delete()
  await db('role_permission').whereIn('role_id', roleIds).delete()
  await db('role').whereIn('id', roleIds).delete()
  await dropCatalog(cat)
  await fs.rm(uploadRoot, { recursive: true, force: true })
  setPublishRunner(shellRunner)
  await db.destroy()
})

describe('session', () => {
  it('logs in, returns the user with permissions and never the hash', async () => {
    const a = request.agent(app)
    const res = await a.post('/api/cms/login').send({ login: `${prefix}-${prefix}-orders`, password: TEST_PASSWORD }).expect(200)
    expect(res.body.user.permissions).toEqual(['orders'])
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password/)
    const cookie = ([] as string[]).concat(res.headers['set-cookie']).find((c) => c.startsWith('rc_cms='))!
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Strict/)
    const me = await a.get('/api/cms/me').expect(200)
    expect(me.body.user.login).toBe(`${prefix}-${prefix}-orders`)
    await a.post('/api/cms/logout').expect(204)
    await a.get('/api/cms/me').expect(401)
  })

  it('rejects bad credentials with one message and throttles after 5 failures', async () => {
    const bad = (login: string, password: string) => request(app).post('/api/cms/login').send({ login, password })
    const unknown = await bad('nobody-' + prefix, 'whatever')
    const wrong = await bad(`${prefix}-${prefix}-orders`, 'wrong')
    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(unknown.body).toEqual(wrong.body)
    for (let i = 0; i < 3; i++) await bad(`${prefix}-${prefix}-orders`, 'wrong')
    await bad(`${prefix}-${prefix}-orders`, 'wrong').expect(401)
    await bad(`${prefix}-${prefix}-orders`, TEST_PASSWORD).expect(429)
  })

  it('needs a cookie, a valid token and a live user', async () => {
    await request(app).get('/api/cms/me').expect(401)
    await request(app).get('/api/cms/me').set('Cookie', 'rc_cms=garbage').expect(401)
    const a = await login('orders')
    await a.get('/api/cms/me').expect(200)
    const id = userIds[1]
    await db('user').where({ id }).update({ deleted: true })
    await a.get('/api/cms/me').expect(401)
    await db('user').where({ id }).update({ deleted: false })
  })

  it('applies permission changes at once', async () => {
    const a = await login('refs')
    await a.get('/api/cms/tables/color').expect(200)
    const role = await db('user').where({ id: userIds[2] }).first('role_id')
    await db('role_permission').where({ role_id: role.role_id }).delete()
    await a.get('/api/cms/tables/color').expect(403)
    await db('role_permission').insert({ role_id: role.role_id, permission: 'references' })
    await a.get('/api/cms/tables/color').expect(200)
  })
})

describe('permissions', () => {
  it('403 without the table permission, 404 for unknown tables, 401 anonymous', async () => {
    await request(app).get('/api/cms/tables/color').expect(401)
    const none = await login('none')
    await none.get('/api/cms/tables/color').expect(403)
    await none.get('/api/cms/tables/order').expect(403)
    const orders = await login('orders')
    await orders.get('/api/cms/tables/order').expect(200)
    await orders.get('/api/cms/tables/price').expect(403)
    await orders.post('/api/cms/tables/color').send({ name: 'x', code: 'zz' }).expect(403)
    const all = await login('all')
    await all.get('/api/cms/tables/nope').expect(404)
    await all.get('/api/cms/tables/constructor').expect(404)
    await all.get('/api/cms/tables/__proto__').expect(404)
  })
})

describe('read-only access for related permissions', () => {
  it('lets order, SEO and price editors read their lookup tables but not write them', async () => {
    const orders = await login('orders')
    await orders.get('/api/cms/tables/order_state').expect(200)
    await orders.post('/api/cms/tables/order_state').send({ name: 'x', priority: 1 }).expect(403)
    await orders.get('/api/cms/tables/page').expect(403)
    const seo = await login('seo')
    await seo.get('/api/cms/tables/page').expect(200)
    await seo.post('/api/cms/tables/page').send({ slug: 'zz-x', name: 'x' }).expect(403)
    await seo.get('/api/cms/tables/product').expect(403)
    const prices = await login('prices')
    await prices.get('/api/cms/tables/product').expect(200)
    await prices.post('/api/cms/tables/product').send({ name: 'x' }).expect(403)
  })
})

describe('tables', () => {
  it('creates, reads, updates, soft-deletes and restores', async () => {
    const a = await login('all')
    const created = await a.post('/api/cms/tables/color').send({ name: `${prefix} new`, code: 'Q9', hex: 'aabbcc' }).expect(201)
    const id = created.body.row.id
    extraIds.color.push(id)
    expect(created.body.row).toMatchObject({ name: `${prefix} new`, code: 'Q9', hex: 'aabbcc' })
    const upd = await a.patch(`/api/cms/tables/color/${id}`).send({ name: `${prefix} renamed` }).expect(200)
    expect(upd.body.row.name).toBe(`${prefix} renamed`)
    await a.delete(`/api/cms/tables/color/${id}`).expect(204)
    const list = await a.get(`/api/cms/tables/color?q=${prefix}%20renamed`).expect(200)
    expect(list.body.rows).toEqual([])
    const deleted = await a.get(`/api/cms/tables/color?deleted=1&q=${prefix}%20renamed`).expect(200)
    expect(deleted.body.rows).toHaveLength(1)
    expect(deleted.body.total).toBe(1)
    await a.post(`/api/cms/tables/color/${id}/restore`).expect(200)
    const back = await a.get(`/api/cms/tables/color/${id}`).expect(200)
    expect(back.body.row.id).toBe(id)
    expect((await db('color').where({ id }).first()).deleted).toBeFalsy()
  })

  it('validates input strictly', async () => {
    const a = await login('all')
    await a.post('/api/cms/tables/color').send({ name: 'x', code: 'toolong' }).expect(400)
    await a.post('/api/cms/tables/color').send({ name: 'x', code: 'ab', id: 5 }).expect(400)
    await a.post('/api/cms/tables/color').send({ name: 'x', code: 'ab', deleted: true }).expect(400)
    await a.patch(`/api/cms/tables/color/${cat.colorIds[0]}`).send({}).expect(400)
    await a.patch('/api/cms/tables/color/999999999').send({ name: 'x' }).expect(404)
    await a.get('/api/cms/tables/color/abc').expect(404)
    await a.get('/api/cms/tables/color?sort=nope').expect(400)
    await a.get('/api/cms/tables/color?nope=1').expect(400)
    await a.get('/api/cms/tables/color?deleted=zzz').expect(400)
    await a.delete('/api/cms/tables/order/1').expect(405)
    await a.post('/api/cms/tables/order').send({}).expect(405)
    await a.post('/api/cms/tables/client').send({}).expect(405)
  })

  it('paginates and filters', async () => {
    const a = await login('all')
    const res = await a.get(`/api/cms/tables/item?product_id=${cat.productId}&limit=1&page=2&sort=id`).expect(200)
    expect(res.body).toMatchObject({ total: 2, page: 2, limit: 1 })
    expect(res.body.rows.map((r: any) => r.id)).toEqual([cat.itemIds[1]])
  })

  it('stores page block content as JSON and returns it parsed', async () => {
    const a = await login('all')
    const page = await a.post('/api/cms/tables/page').send({ slug: `${prefix}-p`, name: 'P' }).expect(201)
    extraIds.page.push(page.body.row.id)
    await a.post('/api/cms/tables/page').send({ slug: `${prefix}-p`, name: 'P2' }).expect(409)
    await a.post('/api/cms/tables/page').send({ slug: 'Bad Slug', name: 'P' }).expect(400)
    const content = { title: 'Hi', list: [1, 2, { a: true }] }
    const block = await a.post('/api/cms/tables/page_block').send({ page_id: page.body.row.id, code: 'hero', priority: 1, content }).expect(201)
    extraIds.page_block.push(block.body.row.id)
    expect(block.body.row.content).toEqual(content)
    const pub = await request(app).get(`/api/pages/${prefix}-p`).expect(200)
    expect(pub.body.blocks[0].content).toEqual(content)
    await a.post('/api/cms/tables/page_block').send({ page_id: page.body.row.id, code: 'x', priority: 1 }).expect(400)
  })

  it('keeps setting code immutable', async () => {
    const a = await login('all')
    const s = await a.post('/api/cms/tables/setting').send({
      code: `${prefix}.k`, name: 'K', type: 'text', value: 'v', priority: 1
    }).expect(201)
    extraIds.setting.push(s.body.row.id)
    await a.patch(`/api/cms/tables/setting/${s.body.row.id}`).send({ code: 'other' }).expect(400)
    await a.patch(`/api/cms/tables/setting/${s.body.row.id}`).send({ value: 'w' }).expect(200)
  })

  it('manages prices and the public price follows', async () => {
    const a = await login('all')
    const p = await a.post('/api/cms/tables/price').send({
      product_id: cat.productId, price: 555, price_date: '2022-06-01T00:00:00Z'
    }).expect(201)
    expect((await request(app).get(`/api/products/${cat.productId}/price`)).body.price).toBe(555)
    await a.delete(`/api/cms/tables/price/${p.body.row.id}`).expect(204)
    expect((await request(app).get(`/api/products/${cat.productId}/price`)).body.price).toBe(200)
    await a.post('/api/cms/tables/price').send({ product_id: cat.productId, price: -1, price_date: '2022-06-01' }).expect(400)
  })

  it('rejects photo names that are paths', async () => {
    const a = await login('all')
    await a.post('/api/cms/tables/index_photo').send({ name: 'x', priority: 1, photo: '../etc/passwd' }).expect(400)
  })
})

describe('users and roles', () => {
  it('hides the password hash, hashes new passwords, protects self', async () => {
    const a = await login('all')
    const list = await a.get(`/api/cms/tables/user?q=${prefix}`).expect(200)
    expect(JSON.stringify(list.body)).not.toMatch(/scrypt|"password"/)
    const roleId = roleIds[0]
    const u = await a.post('/api/cms/tables/user').send({
      name: `${prefix} u`, login: `${prefix}-created`, password: 'longenough1', role_id: roleId
    }).expect(201)
    extraIds.user.push(u.body.row.id)
    expect(u.body.row.password).toBeUndefined()
    const stored = await db('user').where({ id: u.body.row.id }).first()
    expect(stored.password).toMatch(/^scrypt\$/)
    await request(app).post('/api/cms/login').send({ login: `${prefix}-created`, password: 'longenough1' }).expect(200)
    await a.post('/api/cms/tables/user').send({ name: 'x', login: 'y', password: 'short', role_id: roleId }).expect(400)

    const me = (await a.get('/api/cms/me')).body.user
    await a.delete(`/api/cms/tables/user/${me.id}`).expect(400)
    await a.patch(`/api/cms/tables/user/${me.id}`).send({ role_id: roleId }).expect(400)
    await a.patch(`/api/cms/tables/user/${me.id}`).send({ name: `${prefix} all` }).expect(200)
  })

  it('edits role permissions and protects admin from losing users', async () => {
    const a = await login('all')
    const roles = await a.get('/api/cms/roles').expect(200)
    expect(roles.body.roles.find((r: any) => r.id === roleIds[1]).permissions).toEqual(['orders'])
    const set = await a.put(`/api/cms/roles/${roleIds[1]}/permissions`).send({ permissions: ['orders', 'clients', 'orders'] }).expect(200)
    expect(set.body.role.permissions).toEqual(['clients', 'orders'])
    await a.put(`/api/cms/roles/${roleIds[1]}/permissions`).send({ permissions: ['bogus'] }).expect(400)
    await a.put('/api/cms/roles/999999999/permissions').send({ permissions: [] }).expect(404)
    const admin = await db('role').where({ code: 'admin' }).first('id')
    if (admin) {
      await a.put(`/api/cms/roles/${admin.id}/permissions`).send({ permissions: ['orders'] }).expect(400)
    }
    const orders = await login('orders')
    await orders.get('/api/cms/roles').expect(403)
  })

  it('refuses to delete a role in use', async () => {
    const a = await login('all')
    await a.delete(`/api/cms/tables/role/${roleIds[1]}`).expect(409)
    const r = await a.post('/api/cms/tables/role').send({ code: `${prefix}-free`, name: 'free' }).expect(201)
    extraIds.role.push(r.body.row.id)
    await a.delete(`/api/cms/tables/role/${r.body.row.id}`).expect(204)
  })
})

describe('orders and carts', () => {
  it('edits an order, records the editor and exposes items; clients hide secrets', async () => {
    const v = request.agent(app)
    const r1 = await v.post('/api/cart/items').send({ item_id: cat.itemIds[0], quantity: 2 }).expect(200)
    clientTokens.push(([] as string[]).concat(r1.headers['set-cookie']).find((c) => c.startsWith('rc_client='))!.split(';')[0].slice(10))
    const order = (await v.post('/api/orders').send({
      name: 'Иван', city: 'М', phone: '89990000002', e_mail: `${prefix}@example.com`,
      address_delivery: true, delivery_address: 'адрес', consent: true
    }).expect(201)).body.order

    const a = await login('all')
    const row = (await a.get(`/api/cms/tables/order?number=${order.number}`).expect(200)).body.rows[0]
    expect(row.items).toEqual([expect.objectContaining({ item_id: cat.itemIds[0], quantity: 2, price: 200 })])
    const newState = await db('order_state').where('deleted', 0).orderBy('priority', 'desc').first()
    const patched = await a.patch(`/api/cms/tables/order/${row.id}`).send({
      order_state_id: newState.id, payment_state: 'paid', delivery_cost: 300, delivery_reference: 'TRK1'
    }).expect(200)
    expect(patched.body.row).toMatchObject({ payment_state: 'paid', delivery_cost: 300, delivery_reference: 'TRK1', state: newState.name })
    const me = (await a.get('/api/cms/me')).body.user
    expect((await db('order').where({ id: row.id }).first()).updated_by).toBe(me.id)
    await a.patch(`/api/cms/tables/order/${row.id}`).send({ payment_state: 'weird' }).expect(400)
    await a.patch(`/api/cms/tables/order/${row.id}`).send({ sum: 1 }).expect(400)

    const clients = await a.get(`/api/cms/tables/client?e_mail=${prefix}%40example.com`).expect(200)
    expect(clients.body.rows.length).toBeGreaterThan(0)
    expect(JSON.stringify(clients.body)).not.toMatch(/tokenHash|ip_address/)
  })

  it('lists abandoned carts', async () => {
    const v = request.agent(app)
    const r = await v.post('/api/cart/items').send({ item_id: cat.itemIds[1] }).expect(200)
    clientTokens.push(([] as string[]).concat(r.headers['set-cookie']).find((c) => c.startsWith('rc_client='))!.split(';')[0].slice(10))
    const a = await login('all')
    const fresh = await a.get('/api/cms/tables/cart?abandoned=1&hours=24').expect(200)
    const mine = (await a.get('/api/cms/tables/cart?ordered=0&limit=200&sort=id&dir=desc').expect(200)).body.rows
    expect(mine.some((c: any) => c.items.some((i: any) => i.item_id === cat.itemIds[1]))).toBe(true)
    expect(fresh.body.rows.some((c: any) => c.items.some((i: any) => i.item_id === cat.itemIds[1]))).toBe(false)
    const cartId = mine.find((c: any) => c.items.some((i: any) => i.item_id === cat.itemIds[1])).id
    await db('cart').where({ id: cartId }).update({ last_updated: db.raw('DATE_SUB(NOW(), INTERVAL 3 DAY)') })
    const old = await a.get('/api/cms/tables/cart?abandoned=1&hours=24&limit=200').expect(200)
    expect(old.body.rows.some((c: any) => c.id === cartId)).toBe(true)
  })
})

describe('uploads', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

  it('stores an image under a random name by content type', async () => {
    const a = await login('refs')
    const res = await a.post('/api/cms/uploads').attach('file', png, { filename: 'evil.php', contentType: 'text/html' }).expect(201)
    expect(res.body.photo).toMatch(/^[0-9a-f]{32}\.png$/)
    expect((await fs.readFile(path.join(uploadRoot, res.body.photo))).equals(png)).toBe(true)
    const served = await request(app).get(`/uploads/${res.body.photo}`)
    expect(served.status).toBe(200)
  })

  it('refuses non-images, missing files, and users without rights', async () => {
    const a = await login('refs')
    await a.post('/api/cms/uploads').attach('file', Buffer.from('<?php echo 1;'), { filename: 'a.png', contentType: 'image/png' }).expect(400)
    await a.post('/api/cms/uploads').field('x', '1').expect(400)
    const none = await login('none')
    await none.post('/api/cms/uploads').attach('file', png, 'a.png').expect(403)
    await request(app).post('/api/cms/uploads').attach('file', png, 'a.png').expect(401)
  })

  it('rejects files over 10 MB', async () => {
    const a = await login('refs')
    const big = Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024)])
    await a.post('/api/cms/uploads').attach('file', big, 'big.png').expect(413)
  })
})

describe('publish', () => {
  it('runs a build, records the result, blocks a parallel start', async () => {
    let release: () => void = () => undefined
    setPublishRunner(() => new Promise((resolve) => { release = () => resolve({ ok: true, log: 'ok' }) }))
    const a = await login('pub')
    const start = await a.post('/api/cms/publish').expect(202)
    expect(['queued', 'running']).toContain(start.body.publication.state)
    await a.post('/api/cms/publish').expect(409)
    release()
    await waitForIdle()
    const one = await a.get(`/api/cms/publications/${start.body.publication.id}`).expect(200)
    expect(one.body.publication.state).toBe('done')
    expect(one.body.publication.finished_at).toBeTruthy()
    const list = await a.get('/api/cms/publications?limit=5').expect(200)
    expect(list.body.publications[0].id).toBe(start.body.publication.id)
    await a.get('/api/cms/publications/999999999').expect(404)
  })

  it('marks a failing build as failed with its log; without a command it fails clearly', async () => {
    setPublishRunner(async () => ({ ok: false, log: 'boom' }))
    const a = await login('pub')
    const r = await a.post('/api/cms/publish').expect(202)
    await waitForIdle()
    const row = (await a.get(`/api/cms/publications/${r.body.publication.id}`)).body.publication
    expect(row).toMatchObject({ state: 'failed', log: 'boom' })

    setPublishRunner(shellRunner)
    const saved = process.env.PUBLISH_COMMAND
    delete process.env.PUBLISH_COMMAND
    const r2 = await a.post('/api/cms/publish').expect(202)
    await waitForIdle()
    const row2 = (await a.get(`/api/cms/publications/${r2.body.publication.id}`)).body.publication
    expect(row2.state).toBe('failed')
    expect(row2.log).toMatch(/PUBLISH_COMMAND/)
    if (saved) process.env.PUBLISH_COMMAND = saved
  })

  it('needs the publish permission', async () => {
    const orders = await login('orders')
    await orders.post('/api/cms/publish').expect(403)
    await orders.get('/api/cms/publications').expect(403)
    await request(app).post('/api/cms/publish').expect(401)
  })
})
