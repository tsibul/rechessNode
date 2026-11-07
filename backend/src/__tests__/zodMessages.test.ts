import { z } from 'zod'
import '../zodMessages'

const msg = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value)
  return r.success ? null : r.error.issues[0].message
}

describe('zod messages', () => {
  it('match the wording of zod 3', () => {
    expect(msg(z.object({ a: z.string() }), {})).toBe('Required')
    expect(msg(z.string().min(2), 'a')).toBe('String must contain at least 2 character(s)')
    expect(msg(z.string().max(1), 'ab')).toBe('String must contain at most 1 character(s)')
    expect(msg(z.string().email(), 'x')).toBe('Invalid email')
    expect(msg(z.number().int().min(1), 0)).toBe('Number must be greater than or equal to 1')
    expect(msg(z.object({}).strict(), { b: 1 })).toBe("Unrecognized key(s) in object: 'b'")
    expect(msg(z.number(), 'x')).toBe('Expected number, received string')
  })

  it('keeps explicit schema messages', () => {
    expect(msg(z.string().regex(/^a$/, 'Invalid file name'), 'b')).toBe('Invalid file name')
  })
})
