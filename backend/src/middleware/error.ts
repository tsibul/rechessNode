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
  // Log error for debugging
  console.error(err)

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

  // Handle unknown errors
  return res.status(500).json({
    error: 'Internal Server Error'
  })
} 