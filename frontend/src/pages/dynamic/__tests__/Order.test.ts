import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import Order from '../Order.vue'

const cartBody = {
  items: [{ item_id: 1, name: 'Шахматы', article: 'A1B2', photo: null, quantity: 1, price: 1000, sum: 1000 }],
  count: 1,
  total: 1000
}
const res = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })

async function setup(handler: (url: string, init: any) => Promise<unknown>) {
  setActivePinia(createPinia())
  const fetchMock = vi.fn((url: string, init: any) => handler(url, init))
  vi.stubGlobal('fetch', fetchMock)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/order', component: Order },
      { path: '/order/:number', component: { template: '<div/>' } },
      { path: '/:p(.*)*', component: { template: '<div/>' } }
    ]
  })
  router.push('/order')
  await router.isReady()
  const w = mount(Order, { global: { plugins: [router], stubs: { StaticPage: { template: '<div><slot /></div>' } } } })
  await flushPromises()
  return { w, router, fetchMock }
}

const base = (url: string) => {
  if (url.endsWith('/cart')) return res(200, cartBody)
  if (url.includes('/checkout/delivery')) return res(200, { weight_g: 0, door: { cost: 500, name: 'Москва' }, pickup: null })
  if (url.endsWith('/checkout/prefill')) return res(200, { contact: null })
  return null
}

async function fill(w: any, consent: boolean) {
  await w.find('[name=name]').setValue('Иван')
  await w.find('[name=phone]').setValue('+7 999 000-00-00')
  await w.find('[name=e_mail]').setValue('a@b.ru')
  await w.find('[name=city]').setValue('Москва')
  await w.find('[name=delivery_address]').setValue('Москва, ул. 1')
  if (consent) await w.find('[name=consent]').setValue(true)
}

describe('Order page', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('does not submit without consent', async () => {
    const { w, fetchMock } = await setup((u) => base(u) as any)
    await fill(w, false)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Нужно согласие')
    expect(fetchMock.mock.calls.some(([u]) => u.endsWith('/orders'))).toBe(false)
  })

  it('posts the order with consent and goes to the confirmation', async () => {
    const { w, router, fetchMock } = await setup((u, init) =>
      init?.method === 'POST' ? res(201, { order: { number: 77 } }) : (base(u) as any))
    await fill(w, true)
    await w.find('form').trigger('submit')
    await flushPromises()
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!
    const payload = JSON.parse(post[1].body)
    expect(payload).toMatchObject({ name: 'Иван', e_mail: 'a@b.ru', consent: true, address_delivery: true })
    expect(router.currentRoute.value.path).toBe('/order/77')
  })

  it('shows a message on rate limit and stays on the form', async () => {
    const { w, router } = await setup((u, init) =>
      init?.method === 'POST' ? res(429, { error: 'Too many requests, try later' }) : (base(u) as any))
    await fill(w, true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-testid=form-error]').text()).toContain('Слишком много')
    expect(router.currentRoute.value.path).toBe('/order')
  })

  it('shows the delivery cost and total for the city, blocks unavailable method', async () => {
    vi.useFakeTimers()
    try {
      const { w } = await setup((u) => base(u) as any)
      await w.find('[name=city]').setValue('Москва')
      await vi.advanceTimersByTimeAsync(500)
      await flushPromises()
      expect(w.find('[data-testid=order-total]').text()).toContain('Итого: 1\u00a0500')
      await w.findAll('input[name=delivery]')[1].setValue(true)
      await flushPromises()
      expect(w.find('[data-testid=order-total]').text()).toContain('недоступна')
      expect(w.find('[data-testid=submit]').attributes('disabled')).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the empty state for an empty cart', async () => {
    const { w } = await setup((u) =>
      u.endsWith('/cart') ? res(200, { items: [], count: 0, total: 0 }) : (base(u) as any))
    expect(w.find('[data-testid=order-empty]').exists()).toBe(true)
    expect(w.find('form').exists()).toBe(false)
  })

  it('goes to the payment page when the order has a payment', async () => {
    const { w, router } = await setup((u, init) => {
      if (u.endsWith('/orders') && init?.method === 'POST') return res(201, { order: { number: 7, payment: { url: '/order/7/pay' } } })
      return base(u) as any
    })
    await fill(w, true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/order/7/pay')
  })

  it('shows the server message when payment is unavailable and keeps the form', async () => {
    const { w, router } = await setup((u, init) => {
      if (u.endsWith('/orders') && init?.method === 'POST') return res(503, { error: 'Оплата временно недоступна' })
      return base(u) as any
    })
    await fill(w, true)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-testid=form-error]').text()).toContain('Оплата временно недоступна')
    expect(router.currentRoute.value.path).toBe('/order')
  })
})
