export interface OrderRow {
  id: number
  number: number
  date: Date
  client_id: number
  sum: number
  name: string
  family_name: string | null
  city: string | null
  phone: string
  e_mail: string
  delivery_address: string
  address_delivery: boolean
  order_state_id: number
  delivery_point_code: string | null
  delivery_cost: number | null
  delivery_reference: string | null
  payment_state: string
  comment: string | null
  consent_at: Date
  consent_version: string | null
  last_updated: Date
  updated_by: number | null
  deleted: boolean
} 