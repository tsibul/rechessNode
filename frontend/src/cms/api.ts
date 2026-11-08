/**
 * HTTP client of the CMS API (`/api/cms`, see docs/API.md). Session is the
 * HttpOnly cookie `rc_cms`, so every request goes with credentials.
 * @module cms/api
 */
import axios, { AxiosError } from 'axios'

/**
 * A table row as the CMS API returns it.
 */
/** Table row of dynamic shape: columns come from the server per table, so they have no static type (`any` is deliberate; `unknown` would need a cast on every column read). */
export type Row = Record<string, any>

/**
 * The signed-in CMS user.
 */
export interface CmsUser {
  id: number
  name: string
  login: string
  role: { id: number; code: string; name: string }
  permissions: string[]
}

/**
 * Query parameters of a table listing.
 */
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

/**
 * One page of a table listing.
 */
export interface ListResult {
  rows: Row[]
  total: number
  page: number
  limit: number
}

/**
 * A site build (publication) record.
 */
export interface Publication {
  id: number
  state: 'queued' | 'running' | 'done' | 'failed'
  started_by: number | null
  started_at: string
  finished_at: string | null
  log: string | null
}

/**
 * A role with its permission codes.
 */
export interface RoleWithPermissions {
  id: number
  code: string
  name: string
  permissions: string[]
}

/**
 * Axios instance for the `/api/cms` endpoints (cookie session).
 */
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

/**
 * Typed client of the CMS API.
 */
export const cmsApi = {
  /**
   * Signs in.
   * @param login - Login.
   * @param password - Password.
   * @returns The signed-in user.
   */
  login: async (login: string, password: string): Promise<CmsUser> =>
    (await http.post('/login', { login, password })).data.user,
  /**
   * Signs out.
   */
  logout: async (): Promise<void> => {
    await http.post('/logout')
  },
  /**
   * Returns the current user.
   * @returns The signed-in user.
   */
  me: async (): Promise<CmsUser> => (await http.get('/me')).data.user,

  /**
   * Lists rows of a table; empty parameters are dropped.
   * @param table - Table name.
   * @param params - Search, sorting and paging.
   * @returns A page of rows.
   */
  list: async (table: string, params: ListParams = {}): Promise<ListResult> => {
    const clean: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') clean[k] = v
    return (await http.get(`/tables/${table}`, { params: clean })).data
  },
  /**
   * Counts orders per state.
   * @returns Total and per-state counts.
   */
  orderStateCounts: async (): Promise<{ total: number; states: Array<{ id: number; name: string; count: number }> }> =>
    (await http.get('/tables/order/state-counts')).data,
  /**
   * Loads one row.
   * @param table - Table name.
   * @param id - Row id.
   * @returns The row.
   */
  get: async (table: string, id: number): Promise<Row> => (await http.get(`/tables/${table}/${id}`)).data.row,
  /**
   * Creates a row.
   * @param table - Table name.
   * @param body - Field values.
   * @returns The created row.
   */
  create: async (table: string, body: Row): Promise<Row> => (await http.post(`/tables/${table}`, body)).data.row,
  /**
   * Updates a row.
   * @param table - Table name.
   * @param id - Row id.
   * @param body - Changed field values.
   * @returns The updated row.
   */
  update: async (table: string, id: number, body: Row): Promise<Row> =>
    (await http.patch(`/tables/${table}/${id}`, body)).data.row,
  /**
   * Marks a row as deleted.
   * @param table - Table name.
   * @param id - Row id.
   */
  remove: async (table: string, id: number): Promise<void> => {
    await http.delete(`/tables/${table}/${id}`)
  },
  /**
   * Restores a deleted row.
   * @param table - Table name.
   * @param id - Row id.
   * @returns The restored row.
   */
  restore: async (table: string, id: number): Promise<Row> =>
    (await http.post(`/tables/${table}/${id}/restore`)).data.row,

  /**
   * Sends an e-mail about an order to the buyer or the manager.
   * @param id - Order id.
   * @param kind - E-mail kind.
   * @returns The updated order.
   */
  sendOrderMail: async (id: number, kind: 'confirmation' | 'track' | 'manager' | 'confirm'): Promise<Row> =>
    (await http.post(`/tables/order/${id}/send-mail`, { kind })).data.row,

  /**
   * The manager confirms an order that waits for the buyer's e-mail confirmation.
   * @param id - Order id.
   * @returns The updated order.
   */
  confirmOrder: async (id: number): Promise<Row> =>
    (await http.post(`/tables/order/${id}/confirm`)).data.row,

  /**
   * Lists roles with permissions.
   * @returns Roles.
   */
  roles: async (): Promise<RoleWithPermissions[]> => (await http.get('/roles')).data.roles,
  /**
   * Replaces the permissions of a role.
   * @param id - Role id.
   * @param permissions - Permission codes.
   * @returns The updated role.
   */
  setPermissions: async (id: number, permissions: string[]): Promise<RoleWithPermissions> =>
    (await http.put(`/roles/${id}/permissions`, { permissions })).data.role,

  /**
   * Uploads an image.
   * @param file - Image file.
   * @returns Stored file name.
   */
  upload: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    return (await http.post('/uploads', form)).data.photo
  },

  /**
   * Starts a site build.
   * @returns The new publication.
   */
  publish: async (): Promise<Publication> => (await http.post('/publish')).data.publication,
  /**
   * Lists the latest builds.
   * @param limit - Maximum number of records.
   * @returns Publications, newest first.
   */
  publications: async (limit = 20): Promise<Publication[]> =>
    (await http.get('/publications', { params: { limit } })).data.publications
}
