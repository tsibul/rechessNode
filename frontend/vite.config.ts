import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import Pages from 'vite-plugin-pages'
import generateSitemap from 'vite-ssg-sitemap'
import type { ViteSSGOptions } from 'vite-ssg'
import type { Plugin } from 'vite'

// Плагин для клиентских компонентов
function clientOnlyPlugin(): Plugin {
  const clientOnlyComponents = [
    'CartBadge.vue',
    'CookieConsent.vue'
  ]
  
  return {
    name: 'vite-plugin-client-only',
    transform(code, id) {
      if (clientOnlyComponents.some(comp => id.endsWith(comp))) {
        // Оборачиваем компонент в проверку на клиент
        return {
          code: code.replace(
            '<script setup',
            `<script setup>
if (import.meta.env.SSR) {
  // Пропускаем рендеринг на сервере
  defineComponent({
    render: () => null
  })
}`
          ),
          map: null
        }
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Убираем эту опцию, она нам больше не нужна
          // isCustomElement: (tag) => 
          //   ['cart-badge', 'cookie-consent'].includes(tag)
        }
      }
    }),
    clientOnlyPlugin(),
    Pages({
      dirs: [
        { dir: 'src/pages/static', baseRoute: '' }
      ],
      extensions: ['vue'],
      exclude: ['**/components/*.vue', '**/static/**/content/*.vue']
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
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
    onFinished() {
      generateSitemap()
    }
  } as ViteSSGOptions,
  ssr: {
    noExternal: ['js-cookie']
    // Убираем exclude, теперь используем плагин
    // exclude: [
    //   /components\/floating\/.*/
    // ]
  }
}) 