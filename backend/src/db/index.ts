/**
 * Database configuration and connection setup.
 * Uses Knex.js as query builder for MariaDB.
 * @module db
 */

import knex from 'knex'
import { config } from 'dotenv'
import type { Knex } from 'knex'
import * as path from 'path'

// Load environment variables
config()

// Import knexfile configuration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const knexConfig = require(path.join(process.cwd(), 'knexfile')).default as { [key: string]: Knex.Config }

// Determine current environment
const environment = process.env.NODE_ENV || 'development'

console.log('Environment:', environment)
console.log('Available configs:', Object.keys(knexConfig))

/**
 * Knex instance for database operations using environment-specific configuration
 */
export const db = knex(knexConfig[environment])

// Export knex for testing purposes
export { knex }

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.raw('SELECT 1')
    console.log('Database connection established')
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  }
} 