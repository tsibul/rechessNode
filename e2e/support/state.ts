import fs from 'node:fs'
import path from 'node:path'

export const TMP = path.resolve(__dirname, '..', '.tmp')
export const STATE_FILE = path.join(TMP, 'state.json')

export interface RoleUser { login: string; password: string }
export interface State {
  tag: string
  users: { admin: RoleUser; manager: RoleUser; senior: RoleUser }
}

export function readState(): State {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
}
