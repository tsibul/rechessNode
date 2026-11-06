import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

import { db } from '../db'
import type { Knex } from 'knex'

/**
 * Checks the stage 3 schema against the migrated local database.
 * Writes happen inside a transaction that is always rolled back.
 */

async function columns(table: string): Promise<string[]> {
  const rows = await db('information_schema.columns')
    .where({ table_schema: db.raw('DATABASE()'), table_name: table })
    .select('column_name as name')
  return rows.map((r: { name: string }) => r.name)
}

/** Runs fn in a transaction and rolls it back, returning the error fn raised, if any. */
async function rolledBack(fn: (trx: Knex.Transaction) => Promise<void>): Promise<Error | null> {
  let error: Error | null = null
  try {
    await db.transaction(async (trx) => {
      await fn(trx)
      throw new Error('__rollback__')
    })
  } catch (e) {
    if ((e as Error).message !== '__rollback__') error = e as Error
  }
  return error
}

afterAll(async () => {
  await db.destroy()
})

describe('new tables', () => {
  it.each([
    ['product', ['name', 'description', 'deleted']],
    ['role', ['code', 'name', 'deleted']],
    ['role_permission', ['role_id', 'permission']],
    ['page', ['slug', 'name', 'deleted']],
    ['page_block', ['page_id', 'code', 'priority', 'content', 'deleted']],
    ['seo', ['page_id', 'title', 'description', 'og_image', 'robots_index']],
    ['setting', ['code', 'name', 'type', 'value', 'group_name', 'priority']],
    ['publication', ['state', 'started_by', 'started_at', 'finished_at', 'log']]
  ])('%s has its columns', async (table, expected) => {
    expect(await columns(table)).toEqual(expect.arrayContaining(expected))
  })
})

describe('stage 8 delivery', () => {
  it('has tariffs, product size and order delivery and mail marks', async () => {
    expect(await columns('delivery_tariff')).toEqual(expect.arrayContaining(['name', 'address_delivery', 'city', 'weight_to', 'price', 'priority', 'deleted']))
    expect(await columns('product')).toEqual(expect.arrayContaining(['weight_g', 'length_mm', 'width_mm', 'height_mm']))
    expect(await columns('order')).toEqual(expect.arrayContaining([
      'weight_g', 'delivery_tariff_id', 'confirmation_sent_at', 'confirmation_error', 'track_sent_at', 'track_sent_ref', 'track_error'
    ]))
    expect(await db('setting').where({ code: 'delivery.tracking_url' }).first()).toBeTruthy()
  })
})

describe('changed tables', () => {
  it('item and price are linked to product, price.item is gone', async () => {
    expect(await columns('item')).toContain('product_id')
    const price = await columns('price')
    expect(price).toContain('product_id')
    expect(price).not.toContain('item')
  })

  it('shops store working_hours instead of timestamps', async () => {
    const shops = await columns('shops')
    expect(shops).toContain('working_hours')
    expect(shops).not.toContain('start_working')
    expect(shops).not.toContain('end_working')
  })

  it('order carries snapshot, payment, comment and consent', async () => {
    expect(await columns('order')).toEqual(expect.arrayContaining([
      'name', 'phone', 'e_mail', 'delivery_point_code', 'delivery_cost',
      'payment_state', 'comment', 'consent_at', 'consent_version'
    ]))
  })

  it('comment moved from client to order', async () => {
    expect(await columns('client')).not.toContain('comment')
    expect(await columns('client')).toContain('delivery_point_code')
  })

  it('other columns are added', async () => {
    expect(await columns('order_item')).toContain('price')
    expect(await columns('shop_photo')).toContain('shop_id')
    expect(await columns('seller')).toContain('name')
    expect(await columns('user')).toContain('role_id')
  })
})

describe('initial data', () => {
  it('has the three roles with permissions', async () => {
    const roles = await db('role').select('code').orderBy('code')
    expect(roles.map((r) => r.code)).toEqual(['admin', 'manager', 'senior_manager'])

    const perms = async (code: string) =>
      (await db('role_permission').join('role', 'role.id', 'role_permission.role_id')
        .where('role.code', code).pluck('permission')) as string[]
    expect(await perms('admin')).toContain('users')
    expect(await perms('manager')).not.toContain('prices')
    expect(await perms('senior_manager')).toEqual(expect.arrayContaining(['prices', 'seo', 'references']))
    expect(await perms('senior_manager')).not.toContain('users')
  })

  it('has order states, pages and settings', async () => {
    expect(Number((await db('order_state').count({ c: '*' }).first())?.c)).toBeGreaterThanOrEqual(6)
    expect(await db('page').where({ slug: 'index' }).first()).toBeTruthy()
    expect(await db('setting').where({ code: 'contact.email' }).first()).toBeTruthy()
  })
})

describe('constraints', () => {
  it('rejects a duplicate pair for one product', async () => {
    const error = await rolledBack(async (trx) => {
      const [product] = await trx('product').insert({ name: 'p' })
      const [a] = await trx('color').insert({ name: 'a', code: '91' })
      const [b] = await trx('color').insert({ name: 'b', code: '92' })
      await trx('item').insert({ name: 'x', main_color: a, second_color: b, product_id: product })
      await trx('item').insert({ name: 'y', main_color: a, second_color: b, product_id: product })
    })
    expect(error?.message).toMatch(/Duplicate entry/)
  })

  it('rejects a price without a product', async () => {
    const error = await rolledBack(async (trx) => {
      await trx('price').insert({ price: 100, product_id: 999999 })
    })
    expect(error?.message).toMatch(/foreign key/i)
  })

  it('rejects a duplicate order number and a duplicate cart line', async () => {
    const dupOrder = await rolledBack(async (trx) => {
      const client = await trx('client').first()
      const state = await trx('order_state').first()
      const row = {
        number: 987654, client_id: client.id, sum: 1, delivery_address: 'a',
        order_state_id: state.id, name: 'n', phone: '1', e_mail: 'a@b.c'
      }
      await trx('order').insert(row)
      await trx('order').insert(row)
    })
    expect(dupOrder?.message).toMatch(/Duplicate entry/)

    const dupLine = await rolledBack(async (trx) => {
      const cart = await trx('cart').first()
      const item = await trx('item').first()
      await trx('cart_item').insert({ cart_id: cart.id, item_id: item.id, quantity: 1 })
      await trx('cart_item').insert({ cart_id: cart.id, item_id: item.id, quantity: 1 })
    })
    expect(dupLine?.message).toMatch(/Duplicate entry/)
  })

  it('defaults payment_state to not_paid and sets consent time', async () => {
    let state: string | undefined
    let consent: Date | undefined
    const error = await rolledBack(async (trx) => {
      const client = await trx('client').first()
      const st = await trx('order_state').first()
      const [id] = await trx('order').insert({
        number: 987655, client_id: client.id, sum: 1, delivery_address: 'a',
        order_state_id: st.id, name: 'n', phone: '1', e_mail: 'a@b.c'
      })
      const row = await trx('order').where({ id }).first()
      state = row.payment_state
      consent = row.consent_at
    })
    expect(error).toBeNull()
    expect(state).toBe('not_paid')
    expect(consent).toBeInstanceOf(Date)
  })
})
