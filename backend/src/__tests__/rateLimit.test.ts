import express from 'express'
import request from 'supertest'
import { rateLimit } from '../middleware/rateLimit'

function appWith(opts: Parameters<typeof rateLimit>[0]) {
  const app = express()
  app.use(rateLimit(opts))
  app.get('/x', (_req, res) => { res.json({ ok: true }) })
  return app
}

describe('rate limit', () => {
  it('answers 429 with Retry-After after the limit', async () => {
    const app = appWith({ windowMs: 60_000, max: 3, inTest: true })
    for (let i = 0; i < 3; i++) await request(app).get('/x').expect(200)
    const res = await request(app).get('/x').expect(429)
    expect(res.body).toEqual({ error: 'Too many requests, try later' })
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('starts a new window', async () => {
    const app = appWith({ windowMs: 50, max: 1, inTest: true })
    await request(app).get('/x').expect(200)
    await request(app).get('/x').expect(429)
    await new Promise((r) => setTimeout(r, 70))
    await request(app).get('/x').expect(200)
  })

  it('is off in tests unless asked', async () => {
    const app = appWith({ windowMs: 60_000, max: 1 })
    await request(app).get('/x').expect(200)
    await request(app).get('/x').expect(200)
  })
})
