/**
 * Main entry point for the ReChess frontend application.
 * Sets up Vue application with plugins and global configurations.
 * @module main
 */

import {ViteSSG} from 'vite-ssg'

import App from './App.vue'
import {routes} from './router'
import {createPinia} from 'pinia'
import {useCartStore} from './store/cart'
import './clientComponents'

/**
 * Export the SSG configuration
 */
const pinia = createPinia()

export const createApp = ViteSSG(
    App,
    { routes },
    async ({ app, router, isClient }) => {
        app.use(pinia)
        app.use(router)

        if (isClient) {
            await router.isReady()
        }
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
    },

)
