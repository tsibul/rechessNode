import request from 'supertest'
import { app } from '../app'  // You'll need to export your Express app
import { knex } from '../db'  // Your database connection

describe('Example API Tests', () => {
  beforeAll(async () => {
    // Run migrations
    await knex.migrate.latest()
  })

  afterAll(async () => {
    // Clean up database
    await knex.destroy()
  })

  beforeEach(async () => {
    // Clear all tables before each test
    await knex('users').truncate()
    // Add more tables as needed
  })

  it('should demonstrate a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should demonstrate an async test', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body).toEqual({ status: 'ok' })
  })

  it('should demonstrate database interaction', async () => {
    // Example of database test
    const user = {
      email: 'test@example.com',
      name: 'Test User'
    }

    const [id] = await knex('users').insert(user)
    const result = await knex('users').where({ id }).first()

    expect(result).toMatchObject(user)
  })
}) 