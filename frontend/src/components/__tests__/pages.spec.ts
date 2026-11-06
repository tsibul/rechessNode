import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import { routes } from '@/router'
import PageView from '@/pages/static/PageView.vue'
import CookieBanner from '@/components/floating/CookieBanner.vue'

async function render(slug: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push('/')
  await router.isReady()
  return mount(PageView, { props: { slug }, global: { plugins: [createPinia(), router, createHead()] } })
}

describe('public pages', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('home renders header, gallery and footer links', async () => {
    const w = await render('index')
    expect(w.find('[data-testid="photo-grid"]').exists()).toBe(true)
    expect(w.text()).toContain('О проекте')
    expect(w.find('a[href="/privacy"]').exists()).toBe(true)
  })

  it('about renders text', async () => {
    const w = await render('about')
    expect(w.find('h1').text()).toBe('О проекте')
  })

  it('product shows the price and pairs', async () => {
    const w = await render('shop')
    expect(w.find('[data-testid="price"]').text()).toContain('₽')
    expect(w.findAll('input[type="radio"]').length).toBeGreaterThan(1)
  })

  it('where to buy lists shops', async () => {
    const w = await render('where-to-buy')
    expect(w.findAll('.shop').length).toBeGreaterThan(0)
  })

  it('policies render', async () => {
    expect((await render('privacy')).find('h1').text()).toContain('Политика')
    expect((await render('personal-data')).find('h1').text()).toContain('Согласие')
  })

  it('has no cabinet route', () => {
    expect(routes.some((r) => r.path === '/cabinet')).toBe(false)
  })

  it('cookie banner shows until accepted', async () => {
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    const w = mount(CookieBanner)
    await vi.waitFor(() => expect(w.find('[data-testid="cookie-consent"]').exists()).toBe(true))
    await w.find('button').trigger('click')
    await vi.waitFor(() => expect(w.find('[data-testid="cookie-consent"]').exists()).toBe(false))
  })
})
