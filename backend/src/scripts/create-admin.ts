/**
 * Creates the first (or another) admin user. The password is read from stdin, never from arguments.
 * Usage: npm run create-admin -- <login> <name>
 * @module scripts/create-admin
 */
import { config } from 'dotenv'
import readline from 'readline'

config()

import { db } from '../db'
import { hashPassword } from '../utils/password'

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a) }))
}

async function main() {
  const [login, ...nameParts] = process.argv.slice(2)
  const name = nameParts.join(' ')
  if (!login || !name) throw new Error('Usage: npm run create-admin -- <login> <name>')
  const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 8 characters): '))
  if (password.length < 8) throw new Error('Password must be at least 8 characters')
  const role = await db('role').where({ code: 'admin' }).first('id')
  if (!role) throw new Error('Role admin not found: run migrations first')
  await db('user').insert({ name, login, password: await hashPassword(password), role_id: role.id, deleted: false })
  console.log(`Admin ${login} created`)
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1 })
  .finally(() => db.destroy())
