import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from '../cart'

const cartBody = {
  items: [{ item_id: 1, name: 'Шахматы', article: 'A1B2', photo: null, quantity: 2, price: 1000, sum: 2000 }],
  count: 2,
  total: 2000
}
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('cart store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn(() => ok(cartBody)))
  })

  it('loads the server cart with credentials', async () => {
    const cart = useCartStore()
    await cart.load()
    expect(cart.total).toBe(2000)
    expect(cart.count).toBe(2)
    expect(cart.isEmpty).toBe(false)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('/api/cart')
    expect(init.credentials).toBe('include')
  })

  it('adds an item with POST', async () => {
    const cart = useCartStore()
    await cart.add(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('/api/cart/items')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ item_id: 1, quantity: 1 })
  })

  it('changes quantity and removes with PATCH and DELETE', async () => {
    const cart = useCartStore()
    await cart.setQuantity(1, 3)
    await cart.remove(1)
    const calls = (fetch as any).mock.calls
    expect(calls[0][0]).toBe('/api/cart/items/1')
    expect(calls[0][1].method).toBe('PATCH')
    expect(calls[1][1].method).toBe('DELETE')
  })

  it('keeps the error and rethrows on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({ error: 'Too many requests, try later' }) })))
    const cart = useCartStore()
    await expect(cart.add(1)).rejects.toMatchObject({ status: 429 })
    expect(cart.error).toBe('Too many requests, try later')
    expect(cart.loading).toBe(false)
  })

  it('reset empties the cart', async () => {
    const cart = useCartStore()
    await cart.load()
    cart.reset()
    expect(cart.isEmpty).toBe(true)
    expect(cart.count).toBe(0)
  })

  it('reads the badge count from the cookie before loading', () => {
    document.cookie = 'rc_cart_count=4'
    const cart = useCartStore()
    cart.initCount()
    expect(cart.count).toBe(4)
  })
})
