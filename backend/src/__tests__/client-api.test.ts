import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

import request from 'supertest'
import express from 'express'
import { authRouter } from '../routes/auth'
import { db } from '../db'

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

describe('Client API Tests', () => {
  let testToken: string

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    if (testToken) {
      await db('client').where({ tokenHash: testToken }).del()
    }
    await db.destroy()
  })

  describe('POST /api/auth/client/token', () => {
    it('should create new client when no token provided', async () => {
      const response = await request(app)
        .post('/api/auth/client/token')
        .send({})
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('status', 'new')
      expect(response.body).toHaveProperty('client')
      expect(response.body.client).toHaveProperty('id')
      expect(response.body.client).toHaveProperty('name')
      expect(response.body.client.name).toMatch(/^Гость\d{14}$/)

      testToken = response.body.token
    })

    it('should create new client when empty token provided', async () => {
      const response = await request(app)
        .post('/api/auth/client/token')
        .send({ token: '' })
        .set('X-Forwarded-For', '192.168.1.2')
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('status', 'new')
      expect(response.body).toHaveProperty('client')
    })

    it('should return existing client when valid token provided', async () => {
      // First create a client
      const createResponse = await request(app)
        .post('/api/auth/client/token')
        .send({})
        .set('X-Forwarded-For', '192.168.1.3')
        .expect(200)

      const token = createResponse.body.token

      // Then try to get the same client
      const response = await request(app)
        .post('/api/auth/client/token')
        .send({ token })
        .set('X-Forwarded-For', '192.168.1.4')
        .expect(200)

      expect(response.body).toHaveProperty('token', token)
      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('client')
      expect(response.body.client.id).toBe(createResponse.body.client.id)
      expect(response.body.client.name).toBe(createResponse.body.client.name)
    })

    it('should create new client when invalid token provided', async () => {
      const response = await request(app)
        .post('/api/auth/client/token')
        .send({ token: 'invalid-token-123' })
        .set('X-Forwarded-For', '192.168.1.5')
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('status', 'new')
      expect(response.body).toHaveProperty('client')
      expect(response.body.token).not.toBe('invalid-token-123')
    })

    it('should handle missing IP address', async () => {
      const response = await request(app)
        .post('/api/auth/client/token')
        .send({})
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('status', 'new')
      expect(response.body).toHaveProperty('client')
    })
  })
}) 