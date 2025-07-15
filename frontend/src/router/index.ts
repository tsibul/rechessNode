/**
 * Router configuration for the ReChess frontend application.
 * Defines all routes and their corresponding components.
 * @module router
 */

import { Router, createRouter as _createRouter, createWebHistory, createMemoryHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router'

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
      isStatic: true
    }
  },
  {
    path: '/shop',
    name: 'shop',
    component: () => import('../pages/static/shop/Shop.vue'),
    meta: {
      title: 'ReChess - Shop',
      isStatic: true
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../pages/static/about/About.vue'),
    meta: {
      title: 'ReChess - About',
      isStatic: true
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
      title: 'ReChess - CMS',
      isCMS: true
    }
  }
]

/**
 * Creates a router instance with appropriate history mode
 */
export function createRouter(): Router {
  return _createRouter({
    history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
    routes
  })
}

/**
 * Router instance configuration.
 * Uses HTML5 history mode for clean URLs.
 */
const router = createRouter()

/**
 * Navigation guard to update document title based on route metadata.
 */
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  if (typeof window !== 'undefined') {
    document.title = to.meta.title as string || 'ReChess'
  }
  next()
})

export default router 