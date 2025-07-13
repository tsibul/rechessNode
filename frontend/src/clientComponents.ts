import { createApp, h } from 'vue'
import CartBadge from './components/floating/CartBadge.vue'
import CookieConsent from './components/floating/CookieConsent.vue'
import { createPinia } from 'pinia'
import { useCartStore } from './store/cart'
import { useAuthStore } from './store/auth'

// Создаем отдельное приложение для клиентских компонентов
const clientApp = createApp({
  setup() {
    return () => [
      h(CartBadge),
      h(CookieConsent)
    ]
  }
})

// Создаем и подключаем Pinia
const pinia = createPinia()
clientApp.use(pinia)

// Монтируем только на клиенте
if (typeof window !== 'undefined') {
  // Ждем полной загрузки страницы
  window.addEventListener('load', () => {
    const container = document.getElementById('client-components')
    if (container) {
      clientApp.mount(container)
      
      // Инициализируем сторы после монтирования
      const cartStore = useCartStore()
      const authStore = useAuthStore()
      
      // Загружаем начальные данные
      cartStore.initializeFromCookies()
      authStore.checkAuth()
    }
  })
} 