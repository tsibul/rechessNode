/**
 * HTTP client of the backend API (docs/API.md). Cookies travel with every request:
 * the anonymous visitor token is an HttpOnly cookie set by the server.
 * @module services/api
 */

export interface ApiDetail {
  path: Array<string | number>
  message: string
}

export class ApiError extends Error {
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
