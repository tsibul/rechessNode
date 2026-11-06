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

const pinia = createPinia()

/**
 * Site content: read from the backend while building (vite-ssg) and handed to the browser
 * in the initial state, so hydration renders exactly what was built. In `vite dev` there is
 * no build step and the browser reads it itself.
 */
export const createApp = ViteSSG(
    App,
    { routes },
    async ({ app, initialState }) => {
        app.use(pinia)

        const state = initialState as { site?: SiteContent }
        if (import.meta.env.SSR) {
            state.site = await loadSite()
        } else if (!state.site) {
            state.site = await loadSite()
        }
        setSiteContent(state.site)
    },
)
