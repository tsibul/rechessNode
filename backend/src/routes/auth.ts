/**
 * Authentication routes for user login, registration, and session management.
 * @module routes/auth
 */

import { Router, Request, Response } from 'express'
import { ClientRepository } from '../repositories/ClientRepository'

export const authRouter = Router()

/**
 * POST /client/token
 * Get or create client token
 * Body: { token?: string }
 * Headers: X-Forwarded-For or X-Real-IP for IP address
 */
authRouter.post('/client/token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.ip || 
                     req.socket.remoteAddress || 
                     'unknown'

    // If token is provided, try to find existing client
    if (token && token.trim() !== '') {
      const existingClient = await ClientRepository.findByTokenHash(token)
      
      if (existingClient) {
        // Update IP address and return existing client
        const updatedClient = await ClientRepository.updateIpAddress(token, ipAddress)
        
        if (updatedClient) {
          return res.json({
            token: token,
            status: 'ok',
            client: {
              id: updatedClient.getId(),
              name: updatedClient.getName()
            }
          })
        }
      }
    }

    // Create new client with new token
    const newTokenHash = ClientRepository.generateTokenHash()
    const newClient = await ClientRepository.create(newTokenHash, ipAddress)

    return res.json({
      token: newTokenHash,
      status: 'new',
      client: {
        id: newClient.getId(),
        name: newClient.getName()
      }
    })

  } catch (error) {
    console.error('Error in /client/token:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process client token'
    })
  }
}) 