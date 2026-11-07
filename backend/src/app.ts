/**
 * Express application factory (no listening), used by the server and by tests.
 * @module app
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import './zodMessages'
import { router } from './routes'
import { errorHandler } from './middleware/error'
import { uploadDir } from './routes/cms/uploads'

function trustProxy(): string | number | boolean {
  const v = process.env.TRUST_PROXY
  if (v === undefined || v === '') return 'loopback'
  if (v === 'true') return true
  if (v === 'false') return false
  return /^\d+$/.test(v) ? Number(v) : v
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  // X-Forwarded-For is believed only from a proxy on the same machine (nginx), so a client that reaches the
  // backend directly cannot choose its own address. TRUST_PROXY overrides it (Express `trust proxy` syntax).
  app.set('trust proxy', trustProxy())
  // The API serves JSON and uploaded images only; the page CSP belongs to the site (nginx).
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }))
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use('/uploads', express.static(uploadDir(), { index: false, dotfiles: 'deny' }))
  app.use('/api', router)
  app.use(errorHandler)
  return app
}
