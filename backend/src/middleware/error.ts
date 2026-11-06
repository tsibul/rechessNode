/**
 * Error handling middleware for Express application.
 * Processes errors and sends appropriate responses to clients.
 * @module middleware/error
 */

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Error handler middleware function
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    })
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message
    })
  }

  // Database constraint errors
  const code = (err as { code?: string }).code
  if (code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate value' })
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ error: 'Invalid reference' })
  }
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON' })
  if ((err as { type?: string }).type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' })

  console.error(err)
  // Handle unknown errors
  return res.status(500).json({
    error: 'Internal Server Error'
  })
} 