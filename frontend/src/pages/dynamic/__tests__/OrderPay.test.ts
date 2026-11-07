import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import OrderPay from '../OrderPay.vue'

const res = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
const pay = (over = {}) => ({ provider: 'stub', state: 'pending', amount: 2500, url: '/order/7/pay', ref: 'stub_abc12345', stub: true, ...over })

async function setup(handler: (url: string, init: any) => Promise<unknown>) {
  const fetchMock = vi.fn((url: string, init: any) => handler(url, init))
  vi.stubGlobal('fetch', fetchMock)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/order/:number/pay', component: OrderPay },
      { path: '/:p(.*)*', component: { template: '<div/>' } }
    ]
  })
  router.push('/order/7/pay')
  await router.isReady()
  const w = mount(OrderPay, { global: { plugins: [router], stubs: { ShopPage: { template: '<div><slot /></div>' } } } })
  await flushPromises()
  return { w, router, fetchMock }
}

describe('OrderPay stub page', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('says that no money is charged and shows the server amount', async () => {
    const { w } = await setup(() => res(200, { payment: pay() }))
    expect(w.find('[data-testid=pay-stub-note]').text()).toContain('свяжемся')
    // The text ends with the call to press the button, and it stands before the button.
    expect(w.find('[data-testid=pay-stub-note]').text()).toContain('Нажмите «Оплатить»')
    expect(w.find('[data-testid=pay-ok]').text()).toBe('Оплатить')
    const html = w.html()
    expect(html.indexOf('pay-stub-note')).toBeLessThan(html.indexOf('pay-ok'))
    expect(w.find('[data-testid=pay-amount]').text()).toContain('2')
  })

  it('"paid" sends the notification and opens the confirmation', async () => {
    const { w, router, fetchMock } = await setup((_u, init) => (init?.method === 'POST' ? res(200, { state: 'paid', changed: true }) : res(200, { payment: pay() })))
    await w.find('[data-testid=pay-ok]').trigger('click')
    await flushPromises()
    const call = fetchMock.mock.calls.find(([u]) => u.endsWith('/payments/stub/notify'))!
    expect(JSON.parse(call[1].body)).toEqual({ ref: 'stub_abc12345', result: 'paid' })
    expect(router.currentRoute.value.path).toBe('/order/7')
  })

  it('"decline" shows the retry, retry gets a new payment', async () => {
    let state = 'pending'
    const { w } = await setup((u, init) => {
      if (u.endsWith('/payments/stub/notify')) { state = 'failed'; return res(200, { state, changed: true }) }
      if (init?.method === 'POST') { state = 'pending'; return res(200, { payment: pay({ ref: 'stub_new00001' }) }) }
      return res(200, { payment: pay({ state, ref: state === 'pending' ? 'stub_abc12345' : null }) })
    })
    await w.find('[data-testid=pay-fail]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid=pay-declined]').exists()).toBe(true)
    await w.find('[data-testid=pay-retry]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid=pay-ok]').exists()).toBe(true)
  })

  it('a stranger order is not found', async () => {
    const { w } = await setup(() => res(404, { error: 'Not found' }))
    expect(w.find('[data-testid=order-missing]').exists()).toBe(true)
  })
})
