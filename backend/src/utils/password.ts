/**
 * Password hashing: scrypt from node:crypto.
 * Format: scrypt$<salt hex>$<hash hex>.
 * @module utils/password
 */
import { randomBytes, scrypt, timingSafeEqual, ScryptOptions } from 'crypto'

const OPTIONS: ScryptOptions = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, OPTIONS, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt)
  return `scrypt$${salt}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const expected = Buffer.from(parts[2], 'hex')
  if (expected.length !== KEY_LENGTH) return false
  const actual = await derive(password, parts[1])
  return timingSafeEqual(actual, expected)
}
