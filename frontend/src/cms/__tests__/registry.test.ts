import { describe, expect, it } from 'vitest'
import { groupSections, PERMISSIONS, SECTIONS, sectionByKey, visibleSections } from '../registry'

// Tables of the generic backend registry (docs/API.md; roles have their own endpoint): every one must be reachable from the CMS.
const API_TABLES = [
  'color', 'product', 'item', 'item_photo', 'index_photo', 'shops', 'shop_photo', 'seller', 'order_state', 'price',
  'seo', 'page', 'page_block', 'setting', 'user', 'client', 'cart', 'order'
]

describe('registry', () => {
  it('covers every table of the CMS API', () => {
    const tables = SECTIONS.map((s) => s.table).filter(Boolean)
    expect(API_TABLES.filter((t) => !tables.includes(t))).toEqual([])
  })

  it('uses only known permissions and unique keys', () => {
    expect(SECTIONS.every((s) => (PERMISSIONS as readonly string[]).includes(s.permission))).toBe(true)
    expect(new Set(SECTIONS.map((s) => s.key)).size).toBe(SECTIONS.length)
  })

  it('has valid children and select references', () => {
    for (const s of SECTIONS) {
      for (const c of s.children ?? []) {
        const child = sectionByKey(c.section)
        expect(child, `${s.key}->${c.section}`).toBeDefined()
        expect(child!.fields!.some((f) => f.key === c.fk)).toBe(true)
      }
      for (const f of s.fields ?? []) if (f.type === 'select') expect(f.ref, `${s.key}.${f.key}`).toBeTruthy()
    }
  })

  it('shows sections by the permissions of a role', () => {
    const simple = visibleSections(['orders', 'clients', 'carts']).map((s) => s.key)
    expect(simple).toEqual(['orders', 'clients', 'carts'])
    const extended = visibleSections(['orders', 'clients', 'carts', 'references', 'prices', 'seo', 'publish']).map((s) => s.key)
    expect(extended).toEqual(expect.arrayContaining(['products', 'prices', 'seo', 'publish', 'shops', 'order-states']))
    expect(extended).not.toContain('users')
    expect(extended).not.toContain('settings')
    expect(visibleSections([])).toEqual([])
    expect(visibleSections(['users']).map((s) => s.key)).toEqual(['users', 'roles'])
  })

  it('never lists child-only sections in the menu', () => {
    expect(visibleSections([...PERMISSIONS]).some((s) => s.hidden)).toBe(false)
  })

  it('groups sections in order', () => {
    const g = groupSections(visibleSections([...PERMISSIONS]))
    expect(g.map((x) => x.group)).toEqual(['Каталог', 'Сайт', 'Продажи', 'Система'])
  })
})
