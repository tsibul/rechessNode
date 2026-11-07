/**
 * HTTP client of the backend API (docs/API.md). Cookies travel with every request:
 * the anonymous visitor token is an HttpOnly cookie set by the server.
 * @module services/api
 */

/**
 * One field-level error returned by the API.
 */
export interface ApiDetail {
  path: Array<string | number>
  message: string
}

/**
 * Error returned by the API.
 */
export class ApiError extends Error {
  /**
   * Creates an API error.
   * @param status - HTTP status.
   * @param message - Message from the API.
   * @param details - Field-level errors.
   */
  constructor(public status: number, message: string, public details: ApiDetail[] = []) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Origin of the API: build (SSG, Node) uses API_URL, the browser VITE_API_URL or the same origin. */
export function apiBase(): string {
  if (import.meta.env.SSR) return process.env.API_URL || 'http://localhost:3001'
  return import.meta.env.VITE_API_URL ?? ''
}

/**
 * Sends a JSON request to the API.
 * @param path - Path after `/api`.
 * @param init - Method and body.
 * @param init.method - HTTP method (default GET).
 * @param init.body - Value sent as JSON.
 * @returns Parsed response.
 * @throws ApiError when the response is not successful.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${apiBase()}/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body)
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || `HTTP ${res.status}`, (data && data.details) || [])
  }
  return data as T
}
