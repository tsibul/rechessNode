import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import { routes } from '@/router'
import PageView from '@/pages/static/PageView.vue'
import { useCartStore } from '@/store/cart'
import { getProduct, getSeller } from '@/data/content'
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

  it('footer links open a pop-up and keep the address; Esc closes it', async () => {
    const w = await render('index')
    expect(w.find('[data-testid="footer-privacy"]').attributes('href')).toBe('/privacy')
    expect(w.find('[data-testid="footer-legal"]').attributes('href')).toBe('/privacy#company')
    // "Legal information" is the legal details; "About the company" is a different text.
    await w.find('[data-testid="footer-legal"]').trigger('click')
    const dialog = document.querySelector('[data-testid="info-dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain('ИНН')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(document.querySelector('[data-testid="info-dialog"]')).toBeNull()
    await w.find('[data-testid="footer-company"]').trigger('click')
    const about = document.querySelector('[data-testid="info-dialog"]')
    expect(about!.textContent).toContain('ReChess')
    expect(about!.textContent).not.toContain('ИНН')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    w.unmount()
  })

  it('colours show three slides per pair and one next arrow', async () => {
    const w = await render('colors')
    const cards = w.findAll('.card')
    expect(cards.length).toBeGreaterThan(0)
    for (const c of cards) {
      expect(c.findAll('.card__slide').length).toBe(3)
      expect(c.findAll('.card__next').length).toBe(1)
    }
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
    expect(w.find('.card__actions button').text()).toContain('добавить')
  })

  it('marks a pair that is in the cart with a frame and the quantity', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const cart = useCartStore()
    vi.spyOn(cart, 'load').mockResolvedValue(undefined as never)
    const router = createRouter({ history: createMemoryHistory(), routes })
    router.push('/')
    await router.isReady()
    const first = getProduct().pairs[0].id
    cart.items = [{ item_id: first, quantity: 2 }] as never
    const w = mount(PageView, { props: { slug: 'colors' }, global: { plugins: [pinia, router, createHead()] } })
    const framed = w.findAll('.card--in-cart')
    expect(framed).toHaveLength(1)
    expect(framed[0].find('[data-testid="pair-in-cart"]').text()).toBe('в корзине: 2')
    expect(framed[0].find('.card__add').text()).toBe('+ добавить')
    expect(w.findAll('[data-testid="pair-in-cart"]')).toHaveLength(1)
  })

  it('has no where-to-buy page, the route redirects to the shop', () => {
    expect(routes.find((r) => r.path === '/where-to-buy')).toMatchObject({ redirect: '/shop' })
  })

  it('policies render', async () => {
    const privacy = await render('privacy')
    expect(privacy.find('h1').text()).toContain('Политика')
    expect(privacy.findAll('[data-testid="columns"] > div').length).toBe(3)
    expect(privacy.find('#company').text()).toContain('ИНН')
    // The company name in the policy comes from the seller, no placeholder is left.
    expect(privacy.text()).toContain(getSeller().name)
    expect(privacy.text()).not.toContain('{{company}}')
    expect((await render('personal-data')).find('h1').text()).toContain('Политика обработки')
  })

  it('has no cabinet route', () => {
    expect(routes.some((r) => r.path === '/cabinet')).toBe(false)
  })

  it('cookie banner names the cookies and links to the cookie policy', async () => {
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    const w = mount(CookieBanner)
    await vi.waitFor(() => expect(w.find('[data-testid="cookie-consent"]').exists()).toBe(true))
    const text = w.find('.cookie__text').text()
    expect(text).toContain('необходимые')
    expect(text).toContain('аналитические')
    expect(w.find('.cookie__text a').attributes('href')).toBe('/privacy#cookie')
    expect(w.find('[data-testid="cookie-accept"]').text()).toBe('Принять')
    expect(w.find('[data-testid="cookie-decline"]').text()).toBe('Отклонить')
  })

  it('personal data page holds its own policy, not a copy of the cookie policy', async () => {
    const w = await render('personal-data')
    expect(w.find('h1').text()).toContain('Политика обработки')
    expect(w.text()).toContain('Срок хранения')
    expect(w.text()).toContain('Ваши права')
    expect(w.text()).not.toContain('rc_client')
    expect(w.text()).not.toContain('{{')
    const privacy = await render('privacy')
    expect(privacy.find('#cookie').text()).toContain('rc_client')
    expect(privacy.find('#cookie').text()).toContain('«Отклонить»')
    expect(privacy.text()).toContain('владение')
  })

  it('the cookie policy column is the anchor of the banner link', async () => {
    const privacy = await render('privacy')
    expect(privacy.find('#cookie').text()).toContain('Политика использования файлов cookie')
  })

  it('cookie banner shows until accepted', async () => {
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    const w = mount(CookieBanner)
    await vi.waitFor(() => expect(w.find('[data-testid="cookie-consent"]').exists()).toBe(true))
    await w.find('[data-testid="cookie-accept"]').trigger('click')
    await vi.waitFor(() => expect(w.find('[data-testid="cookie-consent"]').exists()).toBe(false))
  })
})
