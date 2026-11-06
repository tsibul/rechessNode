import { createRequire } from 'node:module'
import path from 'node:path'

/** Knex of the backend (its node_modules and .env), used only to set up and clean test rows. */
const backend = path.resolve(__dirname, '..', '..', 'backend')
const req = createRequire(path.join(backend, 'package.json'))

export function connect() {
  req('dotenv').config({ path: path.join(backend, '.env') })
  const knex = req('knex')
  return knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306, database: process.env.DB_NAME,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD
    }
  })
}

/** Same scrypt format as backend/src/utils/password.ts. */
export function hashPassword(password: string): Promise<string> {
  const { scrypt, randomBytes } = req('node:crypto')
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e: Error | null, key: Buffer) =>
      e ? reject(e) : resolve(`scrypt$${salt}$${key.toString('hex')}`))
  })
}
