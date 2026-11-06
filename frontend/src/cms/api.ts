/**
 * HTTP client of the CMS API (`/api/cms`, see docs/API.md). Session is the
 * HttpOnly cookie `rc_cms`, so every request goes with credentials.
 * @module cms/api
 */
import axios, { AxiosError } from 'axios'

export type Row = Record<string, any>

export interface CmsUser {
  id: number
  name: string
  login: string
  role: { id: number; code: string; name: string }
  permissions: string[]
}

export interface ListParams {
  page?: number
  limit?: number
  deleted?: '0' | '1' | 'all'
  sort?: string
  dir?: 'asc' | 'desc'
  q?: string
  /** Extra filters: column or cart flags (`abandoned`, `hours`, `ordered`). */
  [filter: string]: string | number | undefined
}

export interface ListResult {
  rows: Row[]
  total: number
  page: number
  limit: number
}

export interface Publication {
  id: number
  state: 'queued' | 'running' | 'done' | 'failed'
  started_by: number | null
  started_at: string
  finished_at: string | null
  log: string | null
}

export interface RoleWithPermissions {
  id: number
  code: string
  name: string
  permissions: string[]
}

export const http = axios.create({ baseURL: '/api/cms', withCredentials: true })

let onUnauthorized: (() => void) | null = null
/** The store registers a callback that drops the session when any request answers 401. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn
}

http.interceptors.response.use(
  (r) => r,
  (e: AxiosError) => {
    if (e.response?.status === 401 && !String(e.config?.url).endsWith('/login')) onUnauthorized?.()
    return Promise.reject(e)
  }
)

/** Human readable text of an API error. */
export function errorMessage(e: unknown): string {
  const err = e as AxiosError<{ error?: string; details?: { path: (string | number)[]; message: string }[] }>
  const data = err?.response?.data
  if (data?.details?.length) {
    return data.details.map((d) => `${d.path.join('.') || 'поле'}: ${d.message}`).join('; ')
  }
  if (data?.error) return data.error
  if (err?.response) return `Ошибка ${err.response.status}`
  return err?.message || 'Ошибка запроса'
}

export const cmsApi = {
  login: async (login: string, password: string): Promise<CmsUser> =>
    (await http.post('/login', { login, password })).data.user,
  logout: async (): Promise<void> => {
    await http.post('/logout')
  },
  me: async (): Promise<CmsUser> => (await http.get('/me')).data.user,

  list: async (table: string, params: ListParams = {}): Promise<ListResult> => {
    const clean: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') clean[k] = v
    return (await http.get(`/tables/${table}`, { params: clean })).data
  },
  get: async (table: string, id: number): Promise<Row> => (await http.get(`/tables/${table}/${id}`)).data.row,
  create: async (table: string, body: Row): Promise<Row> => (await http.post(`/tables/${table}`, body)).data.row,
  update: async (table: string, id: number, body: Row): Promise<Row> =>
    (await http.patch(`/tables/${table}/${id}`, body)).data.row,
  remove: async (table: string, id: number): Promise<void> => {
    await http.delete(`/tables/${table}/${id}`)
  },
  restore: async (table: string, id: number): Promise<Row> =>
    (await http.post(`/tables/${table}/${id}/restore`)).data.row,

  sendOrderMail: async (id: number, kind: 'confirmation' | 'track'): Promise<Row> =>
    (await http.post(`/tables/order/${id}/send-mail`, { kind })).data.row,

  roles: async (): Promise<RoleWithPermissions[]> => (await http.get('/roles')).data.roles,
  setPermissions: async (id: number, permissions: string[]): Promise<RoleWithPermissions> =>
    (await http.put(`/roles/${id}/permissions`, { permissions })).data.role,

  upload: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    return (await http.post('/uploads', form)).data.photo
  },

  publish: async (): Promise<Publication> => (await http.post('/publish')).data.publication,
  publications: async (limit = 20): Promise<Publication[]> =>
    (await http.get('/publications', { params: { limit } })).data.publications
}
