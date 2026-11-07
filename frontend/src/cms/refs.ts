/**
 * Cache of reference tables for select fields and `ref` columns
 * (id -> label). Reloaded after the CMS changes the table.
 * @module cms/refs
 */
import { reactive } from 'vue'
import { cmsApi } from './api'

/**
 * A select option built from a reference table.
 */
export interface RefOption { value: number; label: string; hex?: string | null }

const cache = reactive<Record<string, RefOption[]>>({})
const loading: Record<string, Promise<void> | undefined> = {}

const key = (table: string, label: string) => `${table}:${label}`

/**
 * Returns options of a loaded reference table.
 * @param table - Table name.
 * @param label - Field used as the label.
 * @returns Options.
 */
export function refOptions(table: string, label = 'name'): RefOption[] {
  return cache[key(table, label)] ?? []
}

/**
 * Returns the label of a reference row.
 * @param table - Table name.
 * @param id - Row id.
 * @param label - Field used as the label.
 * @returns Label, or an empty string.
 */
export function refLabel(table: string, id: unknown, label = 'name'): string {
  const o = refOptions(table, label).find((x) => x.value === Number(id))
  return o ? o.label : id == null ? '—' : `#${id}`
}

/**
 * Returns the colour code of a reference row.
 * @param table - Table name.
 * @param id - Row id.
 * @returns Hex colour, or null.
 */
export function refHex(table: string, id: unknown): string | null {
  return refOptions(table).find((x) => x.value === Number(id))?.hex ?? null
}

/**
 * Loads a reference table into the cache.
 * @param table - Table name.
 * @param label - Field used as the label.
 * @param force - Reload even if cached.
 * @returns Resolves when loaded.
 */
export function loadRef(table: string, label = 'name', force = false): Promise<void> {
  const k = key(table, label)
  if (!force && cache[k]) return Promise.resolve()
  const pending = loading[k]
  if (pending) return pending
  const p = cmsApi
    .list(table, { limit: 200, sort: 'id' })
    .then((r) => {
      cache[k] = r.rows.map((row) => ({
        value: row.id,
        label: String(row[label] ?? row.login ?? `#${row.id}`),
        hex: row.hex ?? null
      }))
    })
    .catch(() => {
      cache[k] = []
    })
    .finally(() => {
      delete loading[k]
    })
  loading[k] = p
  return p
}

/** Forgets cached options of a table after it was changed. */
export function invalidateRef(table: string): void {
  for (const k of Object.keys(cache)) if (k.startsWith(`${table}:`)) delete cache[k]
}
