/**
 * Client token service for managing client authentication
 */

interface ClientTokenResponse {
  token: string
  status: 'new' | 'ok'
  client: {
    id: number
    name: string | null
  }
}

class ClientTokenService {
  private apiUrl = 'http://localhost:3001/api/auth/client/token'
  private cookieName = 'client_token'

  /**
   * Get client token from cookie
   */
  private getTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === this.cookieName) {
        return value
      }
    }
    return null
  }

  /**
   * Set client token as HttpOnly cookie (requires server-side)
   * For now, we'll use regular cookie and handle HttpOnly on server
   */
  private setTokenCookie(token: string): void {
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1) // 1 year
    
    document.cookie = `${this.cookieName}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  }

  /**
   * Get or create client token
   */
  async getClientToken(): Promise<ClientTokenResponse> {
    try {
      const existingToken = this.getTokenFromCookie()
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: existingToken || undefined
        }),
        credentials: 'include' // Для работы с cookies
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ClientTokenResponse = await response.json()
      
      // If new token received, save it to cookie
      if (data.status === 'new') {
        this.setTokenCookie(data.token)
      }

      return data
    } catch (error) {
      console.error('Error getting client token:', error)
      throw error
    }
  }

  /**
   * Initialize client token on page load
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.getClientToken()
      console.log('Client token initialized:', result.status, 'Client ID:', result.client.id)
    } catch (error) {
      console.error('Failed to initialize client token:', error)
    }
  }
}

export const clientTokenService = new ClientTokenService() 