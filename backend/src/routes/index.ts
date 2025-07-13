/**
 * Main router configuration for the ReChess API.
 * Combines all route modules and exports a single router instance.
 * @module routes
 */

import { Router } from 'express'
import { authRouter } from './auth'
import { usersRouter } from './users'

export const router = Router()

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Mount route modules
router.use('/auth', authRouter)
router.use('/users', usersRouter)

// TODO: Add routes for:
// - Products (/products)
// - Cart (/cart)
// - Orders (/orders)
// - Reviews (/reviews) 