import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../api', async (orig) => {
  const actual = await orig<typeof import('../api')>()
  return {
    ...actual,
    cmsApi: {
      me: vi.fn(), login: vi.fn(), logout: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
      restore: vi.fn(), roles: vi.fn(), setPermissions: vi.fn(), upload: vi.fn(), publish: vi.fn(), publications: vi.fn()
    }
  }
})

import { cmsApi } from '../api'
import CmsApp from '../components/CmsApp.vue'
import RecordForm from '../components/RecordForm.vue'
import SeoPreview from '../components/SeoPreview.vue'
import TableSection from '../components/TableSection.vue'
import { sectionByKey } from '../registry'

const api = vi.mocked(cmsApi)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  api.list.mockResolvedValue({ rows: [], total: 0, page: 1, limit: 25 })
  window.location.hash = ''
})

describe('CmsApp', () => {
  it('shows the login form without a session', async () => {
    api.me.mockRejectedValue(new Error('401'))
    const w = mount(CmsApp)
    await flushPromises()
    expect(w.find('input[type=password]').exists()).toBe(true)
  })

  it('shows only the menu items allowed for the role', async () => {
    api.me.mockResolvedValue({
      id: 1, name: 'M', login: 'm', role: { id: 2, code: 'manager', name: 'Менеджер' }, permissions: ['orders', 'clients', 'carts']
    })
    const w = mount(CmsApp)
    await flushPromises()
    const links = w.findAll('.cms-nav__link').map((l) => l.text())
    expect(links).toEqual(['Заказы', 'Клиенты', 'Корзины'])
    expect(w.text()).not.toContain('Пользователи')
  })
})

describe('RecordForm', () => {
  it('blocks saving when required fields are empty and does not call the API', async () => {
    const w = mount(RecordForm, { props: { section: sectionByKey('colors')! } })
    await w.find('form').trigger('submit')
    expect(api.create).not.toHaveBeenCalled()
    expect(w.findAll('.cms-error').length).toBeGreaterThan(0)
  })

  it('sends a valid record and emits saved', async () => {
    api.create.mockResolvedValue({ id: 5, name: 'Красный', code: '03', hex: 'C0392B' })
    const w = mount(RecordForm, { props: { section: sectionByKey('colors')! } })
    const inputs = w.findAll('input')
    await inputs[0].setValue('Красный')
    await inputs[1].setValue('03')
    await inputs[2].setValue('c0392b')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.create).toHaveBeenCalledWith('color', { name: 'Красный', code: '03', hex: 'C0392B' })
    expect(w.emitted('saved')).toBeTruthy()
  })

  it('shows the server error', async () => {
    api.create.mockRejectedValue({ response: { status: 409, data: { error: 'Duplicate entry' } } })
    const w = mount(RecordForm, { props: { section: sectionByKey('colors')! } })
    const inputs = w.findAll('input')
    await inputs[0].setValue('x')
    await inputs[1].setValue('09')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Duplicate entry')
  })
})

describe('TableSection', () => {
  it('requests the list with sort and filters and renders rows', async () => {
    api.list.mockResolvedValue({
      rows: [{ id: 1, number: 1001, date: '2026-11-06T10:00:00', name: 'Иван', sum: 9900, state: 'Новый', payment_state: 'not_paid', items: [] }],
      total: 1, page: 1, limit: 25
    })
    const w = mount(TableSection, { props: { section: sectionByKey('orders')! } })
    await flushPromises()
    expect(api.list).toHaveBeenCalledWith('order', expect.objectContaining({ sort: 'number', dir: 'desc', page: 1 }))
    expect(w.text()).toContain('1001')
    expect(w.text()).toContain('Иван')
    expect(w.text()).toContain('Не оплачен')
  })

  it('has no create/delete buttons for orders', async () => {
    const w = mount(TableSection, { props: { section: sectionByKey('orders')! } })
    await flushPromises()
    expect(w.find('.cms-btn--primary').exists()).toBe(false)
  })
})

describe('photo order', () => {
  it('moves a home page photo down with the arrow button', async () => {
    api.list.mockResolvedValue({
      rows: [{ id: 1, name: 'A', priority: 10, photo: 'a.jpg' }, { id: 2, name: 'B', priority: 20, photo: 'b.jpg' }],
      total: 2, page: 1, limit: 25
    })
    api.update.mockResolvedValue({})
    const w = mount(TableSection, { props: { section: sectionByKey('index-photos')! } })
    await flushPromises()
    const down = w.findAll('[data-move="down"]')
    expect(down).toHaveLength(2)
    expect(w.findAll('[data-move="up"]')[0].attributes('disabled')).toBeDefined()
    await down[0].trigger('click')
    await flushPromises()
    expect(api.update).toHaveBeenCalledWith('index_photo', 1, { priority: 20 })
    expect(api.update).toHaveBeenCalledWith('index_photo', 2, { priority: 10 })
  })

  it('has no arrows in a list that is not ordered by priority', async () => {
    api.list.mockResolvedValue({ rows: [{ id: 1, name: 'x' }], total: 1, page: 1, limit: 25 })
    const w = mount(TableSection, { props: { section: sectionByKey('orders')! } })
    await flushPromises()
    expect(w.find('[data-move]').exists()).toBe(false)
  })
})

describe('SeoPreview', () => {
  it('renders the snippet and social card from the form values', () => {
    const w = mount(SeoPreview, {
      props: { values: { page_id: 1, title: 'Заголовок', description: 'Описание', robots_index: true }, pageSlugs: { 1: 'about' } }
    })
    expect(w.text()).toContain('Заголовок')
    expect(w.text()).toContain('/about')
    expect(w.find('.cms-warn').exists()).toBe(false)
  })
})
