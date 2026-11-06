import fs from 'node:fs'
import { connect } from './db'
import { STATE_FILE, TMP } from './state'
import { releaseLock } from '../../backend/src/testing/leakCheck'

/** Removes everything the run created in the shared database: users, orders and carts of the test e-mails. */
export default async function globalTeardown() {
  try {
    await clean()
  } finally {
    releaseLock()
  }
}

async function clean() {
  if (!fs.existsSync(STATE_FILE)) return
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  const db = connect()
  try {
    const clients = (await db('client').where('e_mail', 'like', 'e2e-%@example.com').select('id')).map((c: { id: number }) => c.id)
    if (clients.length) {
      const orders = (await db('order').whereIn('client_id', clients).select('id')).map((o: { id: number }) => o.id)
      const carts = (await db('cart').whereIn('client_id', clients).select('id')).map((o: { id: number }) => o.id)
      if (orders.length) await db('order_item').whereIn('order_id', orders).delete()
      if (carts.length) await db('cart_item').whereIn('cart_id', carts).delete()
      if (orders.length) await db('order').whereIn('id', orders).delete()
      if (carts.length) await db('cart').whereIn('id', carts).delete()
      await db('client').whereIn('id', clients).delete()
    }
    const users = (await db('user').where('login', 'like', `e2e-${state.tag}-%`).select('id')).map((u: { id: number }) => u.id)
    if (users.length) {
      await db('publication').whereIn('started_by', users).delete()
      await db('order').whereIn('updated_by', users).update({ updated_by: null })
      await db('user').whereIn('id', users).delete()
    }
    for (const [code, value] of Object.entries(state.counters || {})) {
      await db('setting').where({ code }).update({ value })
    }
    await db('page_block').where('code', 'like', 'e2e-%').delete()
    await db('index_photo').where('name', 'like', 'e2e-%').delete()
    await db('delivery_tariff').where('name', 'like', 'e2e-%').delete()
  } finally {
    await db.destroy()
  }
  fs.rmSync(TMP, { recursive: true, force: true })
}
