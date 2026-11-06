import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { connect, hashPassword } from './db'
import { STATE_FILE, TMP, State } from './state'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { acquireLock, releaseLock } from '../../backend/src/testing/leakCheck'

/** Creates the test CMS users (one per role, random passwords kept only in .tmp) and publishes the first site. */
export default async function globalSetup() {
  // The database is shared with jest runs of every session: its row-count check would see the test users.
  await acquireLock()
  try {
    await setup()
  } catch (e) {
    releaseLock()
    throw e
  }
}

async function setup() {
  fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  const tag = randomBytes(3).toString('hex')
  const db = connect()
  const state: State & { counters: Record<string, string | null> } = {
    tag,
    users: {
      admin: { login: `e2e-${tag}-admin`, password: randomBytes(9).toString('hex') },
      manager: { login: `e2e-${tag}-manager`, password: randomBytes(9).toString('hex') },
      senior: { login: `e2e-${tag}-senior`, password: randomBytes(9).toString('hex') }
    },
    counters: {}
  }
  try {
    const roles: Record<string, string> = { admin: 'admin', manager: 'manager', senior: 'senior_manager' }
    for (const [key, code] of Object.entries(roles)) {
      const role = await db('role').where({ code }).first('id')
      const u = state.users[key as keyof State['users']]
      await db('user').insert({
        name: `E2E ${key}`, login: u.login, password: await hashPassword(u.password), role_id: role.id, deleted: false
      })
    }
    // The API of the test run has its own empty upload folder: put a plain picture under every photo name,
    // so thumbnails in the cart and in the mail can be checked.
    const sharp = createRequire(path.resolve(__dirname, '..', '..', 'backend', 'package.json'))('sharp')
    fs.mkdirSync(path.join(TMP, 'uploads'), { recursive: true })
    for (const { photo: file } of await db('item_photo').where({ deleted: false }).select('photo')) {
      if (typeof file !== 'string' || file.includes('/') || file.includes('\\')) continue
      const img = await sharp({ create: { width: 320, height: 320, channels: 3, background: '#b08a6a' } }).jpeg().toBuffer()
      fs.writeFileSync(path.join(TMP, 'uploads', file), img)
    }
    for (const code of ['counter.metrika', 'counter.vk']) {
      const row = await db('setting').where({ code }).first('value')
      state.counters[code] = row ? row.value : null
    }
  } finally {
    await db.destroy()
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), { mode: 0o600 })

  // First publication through the same script the CMS button runs.
  const r = spawnSync('node', ['../frontend/scripts/publish.mjs'], {
    cwd: path.resolve(__dirname, '..', '..', 'backend'),
    env: {
      ...process.env,
      PUBLISH_TARGET: path.join(TMP, 'site'),
      API_URL: `http://localhost:${process.env.E2E_API_PORT || 3101}`
    },
    encoding: 'utf8'
  })
  if (r.status !== 0) throw new Error(`Initial publication failed:\n${r.stdout}\n${r.stderr}`)
}
