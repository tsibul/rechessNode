import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath, URL} from 'node:url'
import {writeSeoFiles} from './build/seoFiles'
import type {ViteSSGOptions} from 'vite-ssg'

/** Pages that are built to static HTML. `/app-shell` is the empty page for the dynamic routes. */
const BUILT_ROUTES = ['/', '/about', '/shop', '/where-to-buy', '/privacy', '/personal-data', '/app-shell']
const OUT_DIR = process.env.BUILD_OUT_DIR || 'dist'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue({
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        },
    },
    build: {
        // The publish script builds into a new release folder, the live site is switched only after success.
        outDir: OUT_DIR,
        emptyOutDir: true
    },
    ssgOptions: {
        script: 'async',
        formatting: 'minify',
        dirStyle: 'flat',
        mock: true,
        crittersOptions: {
            preload: 'js',
            preloadFonts: true,
            inlineThreshold: 2048
        },

        noExternal: ['vue-router'],
        async onFinished() {
            // main.ts leaves the content of this build here; pages the CMS closed from indexing stay out.
            const site = (globalThis as { __rechessSite?: { settings: Record<string, string>; pages: Array<{ slug: string; seo: { robotsIndex: boolean } }> } }).__rechessSite
            const url = site?.settings['site.url'] || process.env.SITE_URL || 'https://rechess.ru'
            const open = site
                ? site.pages.filter((p) => p.seo.robotsIndex).map((p) => (p.slug === 'index' ? '/' : `/${p.slug}`))
                : BUILT_ROUTES
            await writeSeoFiles(OUT_DIR, url, BUILT_ROUTES.filter((r) => r !== '/app-shell' && open.includes(r)))
        },
        includedRoutes() {
            return BUILT_ROUTES
        },
        excludedRoutes: [
            '/cms',
            '/cart',
            '/order',
            '/order/:number'
        ]
    } as ViteSSGOptions,
    ssr: {
        noExternal: ['vue-router','js-cookie']
    }
})
