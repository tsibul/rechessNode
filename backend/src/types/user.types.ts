export interface UserRow {
  id: number
  name: string
  login: string
  password: string
  hashToken: string | null
  role_id: number
  deleted: boolean
}
