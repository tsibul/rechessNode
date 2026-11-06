/**
 * Server cart of the anonymous visitor (docs/API.md). Prices and sums come from the backend only.
 * The badge shows `rc_cart_count` (readable cookie) until the cart is loaded.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '@/services/api'

export interface CartLine {
  item_id: number
  name: string
  article: string
  photo: string | null
  quantity: number
  price: number
  sum: number
}

interface CartResponse {
  items: CartLine[]
  count: number
  total: number
}

function countFromCookie(): number {
  if (typeof document === 'undefined') return 0
  const m = document.cookie.match(/(?:^|;\s*)rc_cart_count=(\d+)/)
  return m ? Number(m[1]) : 0
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartLine[]>([])
  const count = ref(0)
  const total = ref(0)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function apply(c: CartResponse) {
    items.value = c.items
    count.value = c.count
    total.value = c.total
    loaded.value = true
    error.value = null
  }

  async function run(fn: () => Promise<CartResponse>) {
    loading.value = true
    try {
      apply(await fn())
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  const initCount = () => { if (!loaded.value) count.value = countFromCookie() }
  const load = () => run(() => api<CartResponse>('/cart'))
  const add = (itemId: number, quantity = 1) =>
    run(() => api<CartResponse>('/cart/items', { method: 'POST', body: { item_id: itemId, quantity } }))
  const setQuantity = (itemId: number, quantity: number) =>
    run(() => api<CartResponse>(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }))
  const remove = (itemId: number) =>
    run(() => api<CartResponse>(`/cart/items/${itemId}`, { method: 'DELETE' }))
  /** After an order: the server closed the cart. */
  function reset() {
    apply({ items: [], count: 0, total: 0 })
  }

  const isEmpty = computed(() => items.value.length === 0)

  return { items, count, total, loaded, loading, error, isEmpty, initCount, load, add, setQuantity, remove, reset }
})
