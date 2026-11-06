/**
 * Express application factory (no listening), used by the server and by tests.
 * @module app
 */
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { router } from './routes'
import { errorHandler } from './middleware/error'
import { uploadDir } from './routes/cms/uploads'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use('/uploads', express.static(uploadDir(), { index: false, dotfiles: 'deny' }))
  app.use('/api', router)
  app.use(errorHandler)
  return app
}
