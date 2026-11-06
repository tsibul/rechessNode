import { hashPassword, verifyPassword } from '../utils/password'

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const h = await hashPassword('correct horse')
    expect(h).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('uses a fresh salt each time', async () => {
    expect(await hashPassword('x')).not.toBe(await hashPassword('x'))
  })

  it('rejects malformed stored values', async () => {
    expect(await verifyPassword('x', '')).toBe(false)
    expect(await verifyPassword('x', 'plain')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$aa$bb')).toBe(false)
  })
})
