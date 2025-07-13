/**
 * Main entry point for the ReChess frontend application.
 * Sets up Vue application with plugins and global configurations.
 * @module main
 */

import { ViteSSG } from 'vite-ssg'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import App from './App.vue'
import { routes } from './router'
import { createPinia } from 'pinia'
import { useCartStore } from './store/cart'
import { useAppStore } from './store/app'

// Импортируем клиентские компоненты
import './clientComponents'

/**
 * Export the SSG configuration
 */
export const createApp = ViteSSG(
  App,
  { routes },
  async ({ app, router, isClient }) => {
    const pinia = createPinia()
    app.use(pinia)



    const appStore = useAppStore()
    appStore.setIsClient(isClient)

    // Update document title on route change
    router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
      if (typeof window !== 'undefined') {
        document.title = to.meta.title as string || 'ReChess'
      }
      next()
    })

    /**
     * Initialize cart store and load saved cart data from cookies
     * This must be done after pinia is installed but before app is mounted
     * Only initialize on client side
     */
    if (isClient) {
      await router.isReady() // Wait for router to be ready
      const cartStore = useCartStore()
      await cartStore.initializeFromCookies()
    }
  }
) 