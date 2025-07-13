import { defineStore } from 'pinia'
import { ref } from 'vue'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

const isBrowser = typeof window !== 'undefined'

async function getCookies() {
  if (!isBrowser) return null
  const Cookies = (await import('js-cookie')).default
  return Cookies
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isLoading = ref(false)

  // Getters
  function totalItems() {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  }

  function totalPrice() {
    return items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  // Actions
  async function initializeFromCookies() {
    if (!isBrowser) return

    const Cookies = await getCookies()
    if (!Cookies) return

    const savedCart = Cookies.get('cart')
    if (savedCart) {
      try {
        items.value = JSON.parse(savedCart)
      } catch (e) {
        console.error('Failed to parse cart from cookies:', e)
        items.value = []
      }
    }
  }

  async function saveToStorage() {
    if (!isBrowser) return

    const Cookies = await getCookies()
    if (!Cookies) return

    Cookies.set('cart', JSON.stringify(items.value), {
      expires: 7,
      path: '/',
      secure: true,
      sameSite: 'Strict'
    })
  }

  async function addItem(item: CartItem) {
    const existingItem = items.value.find(i => i.id === item.id)
    if (existingItem) {
      existingItem.quantity++
    } else {
      items.value.push({ ...item, quantity: 1 })
    }
    await saveToStorage()
  }

  async function removeItem(itemId: number) {
    items.value = items.value.filter(item => item.id !== itemId)
    await saveToStorage()
  }

  async function clearCart() {
    items.value = []
    await saveToStorage()
  }

  return {
    // State
    items,
    isLoading,
    // Getters
    totalItems,
    totalPrice,
    // Actions
    initializeFromCookies,
    addItem,
    removeItem,
    clearCart
  }
}) 