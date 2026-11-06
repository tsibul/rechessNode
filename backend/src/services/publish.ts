/**
 * Site rebuild ("publication"). One build at a time; state kept in the publication table.
 * @module services/publish
 */
import { spawn } from 'child_process'
import { db } from '../db'
import { ApiError } from '../middleware/error'

const LOG_LIMIT = 4000

/** Runs a build; resolves with the output tail and success flag. */
export type PublishRunner = () => Promise<{ ok: boolean; log: string }>

export const shellRunner: PublishRunner = () => new Promise((resolve) => {
  const command = process.env.PUBLISH_COMMAND
  if (!command) return resolve({ ok: false, log: 'PUBLISH_COMMAND is not set' })
  let out = ''
  const child = spawn(command, { shell: true, cwd: process.env.PUBLISH_CWD || process.cwd() })
  const keep = (d: Buffer) => { out = (out + d.toString()).slice(-LOG_LIMIT) }
  child.stdout.on('data', keep)
  child.stderr.on('data', keep)
  child.on('error', (e) => resolve({ ok: false, log: String(e.message) }))
  child.on('close', (code) => resolve({ ok: code === 0, log: out }))
})

let runner: PublishRunner = shellRunner

/** Test hook: replace the build runner. */
export function setPublishRunner(r: PublishRunner): void {
  runner = r
}

/** Marks publications left unfinished by a previous process as failed. */
export async function failStalePublications(): Promise<void> {
  await db('publication').whereIn('state', ['queued', 'running'])
    .update({ state: 'failed', finished_at: db.fn.now(), log: 'Interrupted by server restart' })
}

export async function startPublication(userId: number) {
  const id = await db.transaction(async (trx) => {
    // Lock the table's active rows so two requests cannot both start.
    const active = await trx('publication').whereIn('state', ['queued', 'running']).forUpdate().first('id')
    if (active) throw new ApiError(409, 'Build already in progress')
    const [newId] = await trx('publication').insert({ state: 'queued', started_by: userId })
    return newId
  })
  void run(id)
  return getPublication(id)
}

async function run(id: number): Promise<void> {
  try {
    await db('publication').where({ id }).update({ state: 'running' })
    const result = await runner()
    await db('publication').where({ id }).update({
      state: result.ok ? 'done' : 'failed', finished_at: db.fn.now(), log: result.ok ? null : result.log.slice(-LOG_LIMIT)
    })
  } catch (e) {
    await db('publication').where({ id }).update({
      state: 'failed', finished_at: db.fn.now(), log: String((e as Error).message).slice(-LOG_LIMIT)
    }).catch(() => undefined)
  }
}

export async function getPublication(id: number) {
  return (await db('publication').where({ id }).first()) ?? null
}

export async function listPublications(limit: number) {
  return db('publication').orderBy('id', 'desc').limit(limit)
}

/** Test hook: wait until no publication is queued or running. */
export async function waitForIdle(timeoutMs = 5000): Promise<void> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (!(await db('publication').whereIn('state', ['queued', 'running']).first('id'))) return
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error('publication did not finish')
}
