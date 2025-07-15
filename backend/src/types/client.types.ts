export interface ClientRow {
  id: number
  tokenHash: string
  name: string | null
  family_name: string | null
  city: string | null
  phone: string | null
  e_mail: string | null
  adress_delivery: boolean
  delivery_address: string | null
  comment: string | null
  ip_address: string | null
  deleted: boolean
} 