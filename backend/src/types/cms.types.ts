export interface ProductRow {
  id: number
  name: string
  description: string | null
  deleted: boolean
}

export interface RoleRow {
  id: number
  code: string
  name: string
  deleted: boolean
}

export interface RolePermissionRow {
  role_id: number
  permission: string
}

export interface PageRow {
  id: number
  slug: string
  name: string
  deleted: boolean
}

export interface PageBlockRow {
  id: number
  page_id: number
  code: string
  priority: number
  content: unknown
  deleted: boolean
}

export interface SeoRow {
  id: number
  page_id: number
  title: string
  description: string
  og_title: string | null
  og_description: string | null
  og_image: string | null
  robots_index: boolean
  deleted: boolean
}

export interface SettingRow {
  id: number
  code: string
  name: string
  type: 'text' | 'html' | 'number' | 'boolean' | 'photo'
  value: string | null
  group_name: string | null
  priority: number
  deleted: boolean
}

export interface PublicationRow {
  id: number
  state: 'queued' | 'running' | 'done' | 'failed'
  started_by: number | null
  started_at: Date
  finished_at: Date | null
  log: string | null
}
