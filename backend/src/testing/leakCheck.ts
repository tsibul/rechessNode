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
  'price', 'user', 'page', 'page_block', 'seo', 'setting', 'shops', 'shop_photo', 'index_photo', 'seller', 'publication', 'delivery_tariff', 'confirmed_email'
]
const FILE = path.join(os.tmpdir(), 'rechess-jest-row-counts.json')
const LOCK = path.join(os.tmpdir(), 'rechess-jest-db.lock')

/**
 * All sessions and worktrees of the machine share one database, so two jest runs at once
 * corrupt each other's row counts (and the shared counts file). Only one run holds the lock;
 * a lock left by a dead process is taken over.
 */
export async function acquireLock(): Promise<void> {
  const deadline = Date.now() + 15 * 60 * 1000
  for (;;) {
    try {
      fs.mkdirSync(LOCK)
      fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid))
      return
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    }
    let alive = true
    try {
      process.kill(Number(fs.readFileSync(path.join(LOCK, 'pid'), 'utf8')), 0)
    } catch (e) {
      // Dead owner only; a missing pid file means the owner is just starting.
      alive = (e as NodeJS.ErrnoException).code !== 'ESRCH'
    }
    if (!alive) {
      fs.rmSync(LOCK, { recursive: true, force: true })
      continue
    }
    if (Date.now() > deadline) throw new Error('Another jest run holds the shared database for too long')
    await new Promise((r) => setTimeout(r, 1000))
  }
}

export function releaseLock(): void {
  fs.rmSync(LOCK, { recursive: true, force: true })
}

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
  await acquireLock()
  try {
    fs.writeFileSync(FILE, JSON.stringify(await counts()))
  } catch (e) {
    releaseLock()
    throw e
  }
}

export async function teardown() {
  try {
    await check()
  } finally {
    releaseLock()
  }
}

async function check() {
  const before = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, number>
  fs.unlinkSync(FILE)
  const after = await counts()
  const leaked = TABLES.filter((t) => after[t] !== before[t]).map((t) => `${t}: ${before[t]} -> ${after[t]}`)
  if (leaked.length) {
    console.error(`\nTests left rows in the database (${leaked.join('; ')})`)
    process.exitCode = 1
  }
}
