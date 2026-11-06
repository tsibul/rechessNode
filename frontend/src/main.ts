/**
 * Main entry point for the ReChess frontend application.
 * Sets up Vue application with plugins and global configurations.
 * @module main
 */

import {ViteSSG} from 'vite-ssg'

import App from './App.vue'
import {routes} from './router'
import {createPinia} from 'pinia'
import {setSiteContent} from './data/content'
import {loadSite} from './data/api'
import type {SiteContent} from './data/types'
import {startCounters, trackPage} from './services/counters'

const pinia = createPinia()

/**
 * Site content: read from the backend while building (vite-ssg) and handed to the browser
 * in the initial state, so hydration renders exactly what was built. In `vite dev` there is
 * no build step and the browser reads it itself.
 */
export const createApp = ViteSSG(
    App,
    { routes },
    async ({ app, router, initialState, isClient }) => {
        app.use(pinia)

        const state = initialState as { site?: SiteContent }
        if (import.meta.env.SSR) {
            state.site = await loadSite()
            // Read by the build (sitemap, robots.txt) when vite-ssg finishes.
            ;(globalThis as { __rechessSite?: SiteContent }).__rechessSite = state.site
        } else if (!state.site) {
            state.site = await loadSite()
        }
        setSiteContent(state.site)

        if (isClient) {
            // Counters start only with the cookie consent; a returning visitor has it already.
            startCounters()
            router.afterEach((to, from) => { if (from.name) trackPage(to.fullPath) })
        }
    },
)
