export interface ClientRow {
  id: number
  tokenHash: string
  name: string | null
  family_name: string | null
  city: string | null
  phone: string | null
  e_mail: string | null
  address_delivery: boolean
  delivery_address: string | null
  delivery_point_code: string | null
  ip_address: string | null
  deleted: boolean
} 