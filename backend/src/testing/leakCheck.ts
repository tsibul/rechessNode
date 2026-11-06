/**
 * Jest global setup/teardown: counts rows of the tables the suites write to before and after
 * the run and fails the run when a suite leaves rows behind.
 */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import dotenv from 'dotenv'

const TABLES = [
  'client', 'cart', 'cart_item', 'order', 'order_item', 'product', 'color', 'item', 'item_photo',
  'price', 'user', 'page', 'page_block', 'seo', 'setting', 'shops', 'shop_photo', 'index_photo', 'seller', 'publication', 'delivery_tariff'
]
const FILE = path.join(os.tmpdir(), 'rechess-jest-row-counts.json')

async function counts(): Promise<Record<string, number>> {
  dotenv.config({ path: path.join(__dirname, '../../.env') })
  // Own connection: the suites' `db` must not be shared with the global hooks.
  const knexConfig = (require(path.join(__dirname, '../../knexfile')) as { default: Record<string, import('knex').Knex.Config> }).default
  const db = (await import('knex')).default(knexConfig[process.env.NODE_ENV || 'development'])
  const out: Record<string, number> = {}
  try {
    for (const t of TABLES) out[t] = Number((await db(t).count({ c: '*' }).first())?.c)
  } finally {
    await db.destroy()
  }
  return out
}

export async function setup() {
  fs.writeFileSync(FILE, JSON.stringify(await counts()))
}

export async function teardown() {
  const before = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, number>
  fs.unlinkSync(FILE)
  const after = await counts()
  const leaked = TABLES.filter((t) => after[t] !== before[t]).map((t) => `${t}: ${before[t]} -> ${after[t]}`)
  if (leaked.length) {
    console.error(`\nTests left rows in the database (${leaked.join('; ')})`)
    process.exitCode = 1
  }
}
