import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath, URL} from 'node:url'
import generateSitemap from 'vite-ssg-sitemap'
import type {ViteSSGOptions} from 'vite-ssg'

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
            }
        },
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
        onFinished() {
            generateSitemap()
        },
        includedRoutes(routes) {
            return ['/', '/about', '/shop']
        },
        excludedRoutes: [
            '/cms',
            '/cart',
            '/cabinet'
        ]
    } as ViteSSGOptions,
    ssr: {
        noExternal: ['vue-router','js-cookie']
    }
})
