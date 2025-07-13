export interface User {
  id: number
  email: string
  name: string
  token_hash: string | null
  cart_id: number | null
  preferences: Record<string, unknown>
  is_active: boolean
  language: string
  shipping_address: string | null
  shipping_city: string | null
  shipping_country: string | null
  shipping_postal_code: string | null
  last_login_at: Date | null
  created_at: Date
  updated_at: Date
}

export type CreateUserData = Omit<User, 'id' | 'created_at' | 'updated_at'>

export type UpdateUserData = Partial<Omit<User, 'id' | 'email' | 'created_at' | 'updated_at'>>

export interface UserFilters {
  search?: string
  isActive?: boolean
  language?: string
}

export interface PaginatedUsersResponse {
  data: User[]
  total: number
  page: number
  limit: number
  totalPages: number
} 