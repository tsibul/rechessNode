export interface ShopsRow {
  id: number
  name: string
  address: string
  start_working: Date | null
  end_working: Date | null
  phone: string | null
  web_site: string | null
  deleted: boolean
} 