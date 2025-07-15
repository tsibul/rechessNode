export interface UserRow {
  id: number
  name: string
  login: string
  password: string
  hashToken: string | null
  deleted: boolean
}
