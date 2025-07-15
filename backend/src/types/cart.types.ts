export interface CartRow {
  id: number
  last_updated: Date
  client_id: number
  ordered: Date | null
  sum: number
  deleted: boolean
} 