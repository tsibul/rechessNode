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
    expect(w.text()).toContain('о проекте')
    expect(w.findAll('.menu__item').length).toBe(3)
    expect(w.find('a[href="/privacy"]').exists()).toBe(true)
  })

  it('about renders text', async () => {
    const w = await render('about')
    expect(w.find('h1').text()).toBe('О проекте')
  })

  it('shop shows the price, the colours link, where to buy and photos', async () => {
    const w = await render('shop')
    expect(w.find('[data-testid="price"]').text()).toContain('₽')
    expect(w.find('a[href="/colors"]').exists()).toBe(true)
    expect(w.findAll('.shop').length).toBeGreaterThan(0)
    expect(w.find('[data-testid="photo-grid"]').exists()).toBe(true)
  })

  it('colours page lists the pairs with add buttons', async () => {
    const w = await render('colors')
    expect(w.findAll('.card').length).toBe(7)
    expect(w.find('.card button').text()).toContain('добавить')
  })

  it('has no where-to-buy page, the route redirects to the shop', () => {
    expect(routes.find((r) => r.path === '/where-to-buy')).toMatchObject({ redirect: '/shop' })
  })

  it('policies render', async () => {
    const privacy = await render('privacy')
    expect(privacy.find('h1').text()).toContain('Политика')
    expect(privacy.findAll('[data-testid="columns"] > div').length).toBe(3)
    expect(privacy.find('#company').text()).toContain('ИНН')
    expect((await render('personal-data')).find('h1').text()).toContain('Политика обработки')
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
