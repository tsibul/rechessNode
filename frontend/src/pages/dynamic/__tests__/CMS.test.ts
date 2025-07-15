import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import CMS from '../CMS.vue'
import CMSettingsComponent from '../../../components/cms/CMSettingsComponent.vue'
import ClientComponent from '../../../components/cms/ClientComponent.vue'
import OrderComponent from '../../../components/cms/OrderComponent.vue'
import CartComponent from '../../../components/cms/CartComponent.vue'

// Mock components
vi.mock('../../../components/cms/CMSettingsComponent.vue', () => ({
  default: {
    name: 'CMSettingsComponent',
    template: '<div class="cms-settings">Settings Component</div>'
  }
}))

vi.mock('../../../components/cms/ClientComponent.vue', () => ({
  default: {
    name: 'ClientComponent',
    template: '<div class="cms-clients">Clients Component</div>'
  }
}))

vi.mock('../../../components/cms/OrderComponent.vue', () => ({
  default: {
    name: 'OrderComponent',
    template: '<div class="cms-orders">Orders Component</div>'
  }
}))

vi.mock('../../../components/cms/CartComponent.vue', () => ({
  default: {
    name: 'CartComponent',
    template: '<div class="cms-cart">Cart Component</div>'
  }
}))

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: { template: '<div>Home</div>' }
    },
    {
      path: '/cms',
      name: 'cms',
      component: { template: '<div>CMS</div>' }
    }
  ]
})

describe('CMS Page', () => {
  let wrapper: any

  beforeEach(async () => {
    await router.push('/cms')
    wrapper = mount(CMS, {
      global: {
        plugins: [router],
        stubs: {
          CMSettingsComponent,
          ClientComponent,
          OrderComponent,
          CartComponent
        }
      }
    })
  })

  describe('Menu Structure', () => {
    it('should have correct menu items', () => {
      const menuItems = wrapper.findAll('.menu__item')
      
      expect(menuItems).toHaveLength(5)
      expect(menuItems[0].text()).toBe('главная')
      expect(menuItems[1].text()).toBe('настройки')
      expect(menuItems[2].text()).toBe('клиенты')
      expect(menuItems[3].text()).toBe('заказы')
      expect(menuItems[4].text()).toBe('корзина')
    })

    it('should have correct menu structure like Header', () => {
      const menu = wrapper.find('.menu')
      const menuFrame = wrapper.find('.menu-frame')
      const siteHeader = wrapper.find('.site-header')
      
      expect(menu.exists()).toBe(true)
      expect(menuFrame.exists()).toBe(true)
      expect(siteHeader.exists()).toBe(true)
    })
  })

  describe('Navigation', () => {
    it('should have link to home page', () => {
      const homeLink = wrapper.find('a[href="/"]')
      expect(homeLink.exists()).toBe(true)
      expect(homeLink.text()).toBe('главная')
    })

    it('should have links for CMS sections', () => {
      const links = wrapper.findAll('a')
      expect(links).toHaveLength(5) // home, settings, clients, orders, cart
    })
  })

  describe('Component Switching', () => {
    it('should show settings component by default', () => {
      expect(wrapper.findComponent(CMSettingsComponent).exists()).toBe(true)
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(false)
      expect(wrapper.findComponent(OrderComponent).exists()).toBe(false)
      expect(wrapper.findComponent(CartComponent).exists()).toBe(false)
    })

    it('should switch to clients component when clients link clicked', async () => {
      const links = wrapper.findAll('a')
      const clientsLink = links.find(link => link.text() === 'клиенты')
      expect(clientsLink).toBeDefined()
      await clientsLink!.trigger('click')
      
      expect(wrapper.findComponent(CMSettingsComponent).exists()).toBe(false)
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(true)
      expect(wrapper.findComponent(OrderComponent).exists()).toBe(false)
      expect(wrapper.findComponent(CartComponent).exists()).toBe(false)
    })

    it('should switch to orders component when orders link clicked', async () => {
      const links = wrapper.findAll('a')
      const ordersLink = links.find(link => link.text() === 'заказы')
      expect(ordersLink).toBeDefined()
      await ordersLink!.trigger('click')
      
      expect(wrapper.findComponent(CMSettingsComponent).exists()).toBe(false)
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(false)
      expect(wrapper.findComponent(OrderComponent).exists()).toBe(true)
      expect(wrapper.findComponent(CartComponent).exists()).toBe(false)
    })

    it('should switch to cart component when cart link clicked', async () => {
      const links = wrapper.findAll('a')
      const cartLink = links.find(link => link.text() === 'корзина')
      expect(cartLink).toBeDefined()
      await cartLink!.trigger('click')
      
      expect(wrapper.findComponent(CMSettingsComponent).exists()).toBe(false)
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(false)
      expect(wrapper.findComponent(OrderComponent).exists()).toBe(false)
      expect(wrapper.findComponent(CartComponent).exists()).toBe(true)
    })

    it('should switch back to settings component when settings link clicked', async () => {
      // First switch to clients
      const links = wrapper.findAll('a')
      const clientsLink = links.find(link => link.text() === 'клиенты')
      expect(clientsLink).toBeDefined()
      await clientsLink!.trigger('click')
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(true)
      
      // Then switch back to settings
      const settingsLink = links.find(link => link.text() === 'настройки')
      expect(settingsLink).toBeDefined()
      await settingsLink!.trigger('click')
      
      expect(wrapper.findComponent(CMSettingsComponent).exists()).toBe(true)
      expect(wrapper.findComponent(ClientComponent).exists()).toBe(false)
    })
  })

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      expect(wrapper.find('.cms-container').exists()).toBe(true)
      expect(wrapper.find('.cms-content').exists()).toBe(true)
      expect(wrapper.find('.cms-content-wrapper').exists()).toBe(true)
    })

    it('should have menu styling like Header', () => {
      const menu = wrapper.find('.menu')
      expect(menu.classes()).toContain('menu')
      
      const menuItems = wrapper.findAll('.menu__item')
      menuItems.forEach((item: any) => {
        expect(item.classes()).toContain('menu__item')
      })
    })
  })
}) 