export interface OrderRow {
  id: number
  number: number
  date: Date
  client_id: number
  sum: number
  delivery_address: string
  address_delivery: boolean
  order_state_id: number
  delivery_reference: string | null
  last_updated: Date
  updated_by: number | null
  deleted: boolean
} 