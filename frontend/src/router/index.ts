/**
 * Router configuration for the ReChess frontend application.
 * Defines all routes and their corresponding components.
 * @module router
 */

import { RouteRecordRaw } from 'vue-router'

/**
 * Route definitions for the application.
 * Each route maps a URL path to a component and includes metadata.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/static/index/Index.vue'),
    meta: {
      title: 'ReChess - Home',
    }
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import('../pages/static/shop/Shop.vue'),
    meta: {
      title: 'ReChess - Shop',
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../pages/static/about/About.vue'),
    meta: {
      title: 'ReChess - About',
    }
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('../pages/dynamic/Cart.vue'),
    meta: {
      title: 'ReChess - Cart'
    }
  },
  {
    path: '/cabinet',
    name: 'cabinet',
    component: () => import('../pages/dynamic/Cabinet.vue'),
    meta: {
      title: 'ReChess - Cabinet'
    }
  },
  {
    path: '/cms',
    name: 'cms',
    component: () => import('../pages/dynamic/CMS.vue'),
    meta: {
      title: 'ReChess - cms',
    }
  },

]
