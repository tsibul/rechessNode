/**
 * Entry point for the ReChess backend application.
 * Sets up Express server with middleware and routes.
 * @module index
 */

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { config } from 'dotenv'
import { router } from './routes'
import { errorHandler } from './middleware/error'

// Load environment variables
config()

/**
 * Express application instance
 */
const app = express()

/**
 * Server port from environment variables or default
 */
const PORT = process.env.PORT || 3001

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(express.json())

// Routes
app.use('/api', router)

// Error handling
app.use(errorHandler)

/**
 * Start the server and listen for incoming requests
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
}) 