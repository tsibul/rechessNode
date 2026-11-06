/**
 * Routes of the ReChess frontend. Public content pages share one component
 * (`PageView`) and differ by the page slug from the content layer.
 * @module router
 */

import { RouteRecordRaw } from 'vue-router'

const page = (path: string, name: string, slug: string): RouteRecordRaw => ({
  path,
  name,
  component: () => import('../pages/static/PageView.vue'),
  props: { slug }
})

export const routes: RouteRecordRaw[] = [
  page('/', 'home', 'index'),
  page('/about', 'about', 'about'),
  page('/shop', 'shop', 'shop'),
  page('/where-to-buy', 'where-to-buy', 'where-to-buy'),
  page('/privacy', 'privacy', 'privacy'),
  page('/personal-data', 'personal-data', 'personal-data'),
  {
    path: '/cart',
    name: 'cart',
    component: () => import('../pages/dynamic/Cart.vue')
  },
  {
    path: '/order',
    name: 'order',
    component: () => import('../pages/dynamic/Order.vue')
  },
  {
    path: '/order/:number',
    name: 'order-done',
    component: () => import('../pages/dynamic/OrderDone.vue')
  },
  {
    path: '/app-shell',
    name: 'app-shell',
    component: () => import('../pages/dynamic/AppShell.vue')
  },
  {
    path: '/cms',
    name: 'cms',
    component: () => import('../pages/dynamic/CMS.vue')
  }
]
