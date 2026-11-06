import { describe, expect, it } from 'vitest'
import {
  buildPayload, formatMoney, groupSettings, initialValues, parseJson, seoPreview, settingFromInput, settingToInput,
  toInputDateTime, truncate, validate
} from '../logic'
import { sectionByKey } from '../registry'

const fields = (key: string) => sectionByKey(key)!.fields!

describe('validate', () => {
  it('requires fields and checks types', () => {
    const e = validate(fields('colors'), { name: '', code: 'ab', hex: 'zzz' }, true)
    expect(e.name).toBeTruthy()
    expect(e.hex).toBeTruthy()
    expect(e.code).toBeUndefined()
  })

  it('requires a password on create only and checks its length', () => {
    const f = fields('users')
    const base = { name: 'a', login: 'a', role_id: 1 }
    expect(validate(f, { ...base, password: '' }, true).password).toBeTruthy()
    expect(validate(f, { ...base, password: '' }, false).password).toBeUndefined()
    expect(validate(f, { ...base, password: 'short' }, false).password).toBeTruthy()
  })

  it('rejects broken JSON of a page block', () => {
    const f = fields('page-blocks')
    const base = { page_id: 1, code: 'text', priority: 1 }
    expect(validate(f, { ...base, content: '{bad' }, true).content).toMatch(/JSON/)
    expect(validate(f, { ...base, content: '{"a":1}' }, true).content).toBeUndefined()
  })
})

describe('buildPayload', () => {
  it('turns form values into the API body', () => {
    const body = buildPayload(
      fields('colors'),
      { name: 'Чёрный', code: '01', hex: '1a1a1a' },
      true
    )
    expect(body).toEqual({ name: 'Чёрный', code: '01', hex: '1A1A1A' })
  })

  it('sends empty optional text as null and parses JSON and numbers', () => {
    expect(buildPayload(fields('shops'), { name: 'M', address: 'a', working_hours: '', phone: '', web_site: '' }, true))
      .toMatchObject({ working_hours: null, phone: null })
    expect(buildPayload(fields('page-blocks'), { page_id: '2', code: 'text', priority: '10', content: '{"x":[1]}' }, true))
      .toEqual({ page_id: 2, code: 'text', priority: 10, content: { x: [1] } })
  })

  it('omits an empty password on edit and a nullable number sends null', () => {
    const body = buildPayload(fields('users'), { name: 'a', login: 'b', password: '', role_id: 2 }, false)
    expect('password' in body).toBe(false)
    const order = buildPayload(fields('orders'), {
      order_state_id: 1, payment_state: 'paid', delivery_reference: '', delivery_cost: null, comment: ''
    }, false)
    expect(order.delivery_cost).toBeNull()
    expect(order.delivery_reference).toBeNull()
  })

  it('does not send createOnly fields on edit', () => {
    const f = [{ key: 'code', label: 'c', type: 'text' as const, createOnly: true }, { key: 'name', label: 'n', type: 'text' as const }]
    expect(buildPayload(f, { code: 'x', name: 'y' }, false)).toEqual({ name: 'y' })
    expect(buildPayload(f, { code: 'x', name: 'y' }, true)).toEqual({ code: 'x', name: 'y' })
  })
})

describe('initialValues', () => {
  it('fills defaults for new records and pretty prints JSON of existing ones', () => {
    expect(initialValues(fields('seo'), null).robots_index).toBe(true)
    const v = initialValues(fields('page-blocks'), { page_id: 1, code: 'text', priority: 1, content: { a: 1 } })
    expect(JSON.parse(v.content)).toEqual({ a: 1 })
  })
  it('never prefills a password', () => {
    expect(initialValues(fields('users'), { name: 'a', login: 'b', password: 'hash', role_id: 1 }).password).toBe('')
  })
})

describe('formatting', () => {
  it('formats money, empty values and dates for inputs', () => {
    expect(formatMoney(9900)).toContain('9')
    expect(formatMoney(null)).toBe('—')
    expect(toInputDateTime('garbage')).toBe('')
    expect(toInputDateTime('2026-11-06T10:30:00')).toBe('2026-11-06T10:30')
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(parseJson('{').ok).toBe(false)
  })
})

describe('seoPreview', () => {
  it('falls back to title and description for social tags and builds the url', () => {
    const p = seoPreview({ title: 'T', description: 'D', og_title: '', og_description: null, robots_index: true }, 'https://x.ru/', 'about')
    expect(p.ogTitle).toBe('T')
    expect(p.ogDescription).toBe('D')
    expect(p.url).toBe('https://x.ru/about')
    expect(seoPreview({ title: 'T', description: 'D' }, 'https://x.ru/', 'index').url).toBe('https://x.ru')
  })
  it('warns about long texts and closed indexing and truncates the snippet', () => {
    const p = seoPreview({ title: 'a'.repeat(80), description: 'b'.repeat(200), robots_index: false }, '', '')
    expect(p.warnings.length).toBe(3)
    expect(p.title.length).toBe(60)
    expect(p.indexed).toBe(false)
  })
})

describe('settings helpers', () => {
  it('converts boolean values both ways and clears empty text', () => {
    expect(settingToInput('boolean', '1')).toBe(true)
    expect(settingToInput('boolean', '0')).toBe(false)
    expect(settingFromInput('boolean', true)).toBe('1')
    expect(settingFromInput('text', '')).toBeNull()
  })
  it('groups by group_name sorted by priority', () => {
    const g = groupSettings([
      { group_name: 'SEO', priority: 2, code: 'b' },
      { group_name: 'SEO', priority: 1, code: 'a' },
      { group_name: null, priority: 1, code: 'c' }
    ])
    expect(g.map((x) => x.group)).toEqual(['SEO', 'Прочее'])
    expect(g[0].rows.map((r) => r.code)).toEqual(['a', 'b'])
  })
})
