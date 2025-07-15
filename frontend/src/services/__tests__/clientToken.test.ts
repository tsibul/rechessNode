import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clientTokenService } from '../clientToken'

// Mock fetch
global.fetch = vi.fn()

describe('ClientTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cookies
    document.cookie = 'client_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getClientToken', () => {
    it('should create new client when no token in cookie', async () => {
      const mockResponse = {
        token: 'new-token-123',
        status: 'new' as const,
        client: {
          id: 1,
          name: 'Гость20241201143022'
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await clientTokenService.getClientToken()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/client/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: undefined
          }),
          credentials: 'include'
        }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should use existing token from cookie', async () => {
      // Set cookie
      document.cookie = 'client_token=existing-token-456; path=/'

      const mockResponse = {
        token: 'existing-token-456',
        status: 'ok' as const,
        client: {
          id: 1,
          name: 'Гость20241201143022'
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await clientTokenService.getClientToken()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/client/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: 'existing-token-456'
          }),
          credentials: 'include'
        }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle API error', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(clientTokenService.getClientToken()).rejects.toThrow('HTTP error! status: 500')
    })

    it('should handle network error', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(clientTokenService.getClientToken()).rejects.toThrow('Network error')
    })
  })

  describe('initialize', () => {
    it('should initialize client token successfully', async () => {
      const mockResponse = {
        token: 'new-token-789',
        status: 'new' as const,
        client: {
          id: 2,
          name: 'Гость20241201143023'
        }
      }

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await clientTokenService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Client token initialized:',
        'new',
        'Client ID:',
        2
      )

      consoleSpy.mockRestore()
    })

    it('should handle initialization error', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('API error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await clientTokenService.initialize()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize client token:',
        new Error('API error')
      )

      consoleSpy.mockRestore()
    })
  })
}) 