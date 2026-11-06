/**
 * Pure helpers of the CMS: form values <-> API payload, validation, formatting,
 * SEO preview. No DOM, covered by unit tests.
 * @module cms/logic
 */
import type { Field } from './registry'
import type { Row } from './api'

export type FormValues = Record<string, any>

/** Initial form values for a new record or an existing row. */
export function initialValues(fields: Field[], row?: Row | null, fixed: Row = {}): FormValues {
  const v: FormValues = {}
  for (const f of fields) {
    if (f.type === 'password') { v[f.key] = ''; continue }
    if (row) {
      const raw = row[f.key]
      if (f.type === 'json') v[f.key] = JSON.stringify(raw ?? null, null, 2)
      else if (f.type === 'datetime') v[f.key] = toInputDateTime(raw)
      else if (f.type === 'boolean') v[f.key] = !!raw
      else v[f.key] = raw ?? (f.type === 'select' || f.type === 'number' ? null : '')
    } else if (f.default !== undefined) {
      v[f.key] = f.type === 'json' ? JSON.stringify(f.default, null, 2) : f.default
    } else {
      v[f.key] = f.type === 'boolean' ? false : f.type === 'select' || f.type === 'number' ? null : ''
    }
  }
  return { ...v, ...fixed }
}

/** `2026-11-06T10:00:00.000Z` -> value for `<input type="datetime-local">` in local time. */
export function toInputDateTime(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Client side checks before sending; the backend remains the authority. */
export function validate(fields: Field[], values: FormValues, creating: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (f.createOnly && !creating) continue
    const v = values[f.key]
    const empty = v === null || v === undefined || v === ''
    if (f.type === 'password') {
      if (creating && empty) errors[f.key] = 'Обязательное поле'
      else if (!empty && String(v).length < 8) errors[f.key] = 'Не меньше 8 символов'
      continue
    }
    if (f.required && empty && f.type !== 'boolean') { errors[f.key] = 'Обязательное поле'; continue }
    if (empty) continue
    if (f.type === 'number' && !Number.isInteger(Number(v))) errors[f.key] = 'Нужно целое число'
    if (f.type === 'hex' && !/^[0-9a-fA-F]{6}$/.test(String(v))) errors[f.key] = '6 символов 0-9, a-f'
    if (f.type === 'json') {
      const r = parseJson(String(v))
      if (!r.ok) errors[f.key] = `Некорректный JSON: ${r.error}`
    }
  }
  return errors
}

/** Values of the form -> body of POST/PATCH. */
export function buildPayload(fields: Field[], values: FormValues, creating: boolean): Row {
  const out: Row = {}
  for (const f of fields) {
    if (f.createOnly && !creating) continue
    const v = values[f.key]
    const empty = v === null || v === undefined || v === ''
    switch (f.type) {
      case 'password':
        if (!empty) out[f.key] = v
        break
      case 'number':
      case 'select':
        out[f.key] = empty ? (f.nullable ? null : undefined) : Number(v)
        if (out[f.key] === undefined) delete out[f.key]
        break
      case 'boolean':
        out[f.key] = !!v
        break
      case 'json':
        out[f.key] = JSON.parse(String(v))
        break
      case 'datetime':
        if (!empty) out[f.key] = new Date(String(v)).toISOString()
        break
      case 'hex':
        out[f.key] = empty ? null : String(v).toUpperCase()
        break
      default:
        // Optional text is sent as null so the column can be cleared.
        out[f.key] = empty ? (f.required ? '' : null) : v
    }
  }
  return out
}

export function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return `${Number(value).toLocaleString('ru-RU')} ₽`
}

export function formatDate(value: unknown): string {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

export interface SeoPreviewData {
  title: string
  description: string
  url: string
  ogTitle: string
  ogDescription: string
  ogImage: string | null
  indexed: boolean
  warnings: string[]
}

/** What a search engine and a social network show for the SEO form values. */
export function seoPreview(values: FormValues, siteUrl: string, slug: string): SeoPreviewData {
  const title = String(values.title ?? '')
  const description = String(values.description ?? '')
  const ogTitle = String(values.og_title || title)
  const ogDescription = String(values.og_description || description)
  const base = siteUrl.replace(/\/+$/, '')
  const url = slug === 'index' || !slug ? base || '/' : `${base}/${slug}`
  const warnings: string[] = []
  if (title.length > 60) warnings.push('Заголовок длиннее 60 символов: поисковик его обрежет')
  if (description.length > 160) warnings.push('Описание длиннее 160 символов: поисковик его обрежет')
  if (!description) warnings.push('Описание пустое')
  if (values.robots_index === false) warnings.push('Страница закрыта от индексации')
  return {
    title: truncate(title, 60),
    description: truncate(description, 160),
    url,
    ogTitle: truncate(ogTitle, 70),
    ogDescription: truncate(ogDescription, 200),
    ogImage: values.og_image || null,
    indexed: values.robots_index !== false,
    warnings
  }
}

/** Value of a setting by its type for an input; `boolean` is stored as `1`/`0`. */
export function settingToInput(type: string, value: string | null): string | boolean {
  if (type === 'boolean') return value === '1' || value === 'true'
  return value ?? ''
}

export function settingFromInput(type: string, value: string | boolean): string | null {
  if (type === 'boolean') return value ? '1' : '0'
  const s = String(value)
  return s === '' ? null : s
}

/** Settings grouped by `group_name`, sorted by `priority` inside. */
export function groupSettings<T extends Record<string, any>>(rows: T[]): { group: string; rows: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const g = r.group_name || 'Прочее'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(r)
  }
  return [...groups.entries()].map(([group, items]) => ({
    group,
    rows: items.slice().sort((a, b) => a.priority - b.priority)
  }))
}

export function photoUrl(name: string | null | undefined): string | null {
  return name ? `/uploads/${name}` : null
}
