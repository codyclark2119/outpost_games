import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import './style.css'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

// Lazy load views for better performance and code splitting
// Only Home is eagerly loaded since it's the landing page
import Home from './views/Home.vue'

// Define routes with lazy-loaded components
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('./views/Products.vue'),
  },
  {
    path: '/products/:typeId',
    name: 'ProductsGameType',
    component: () => import('./views/ProductsGameType.vue'),
  },
  {
    path: '/events',
    name: 'Events',
    component: () => import('./views/Events.vue'),
  },
  // About/Contact folded into the single-page Home as anchor sections —
  // redirect old bookmarks/inbound links rather than 404 them.
  { path: '/about', redirect: () => ({ path: '/', hash: '#about' }) },
  { path: '/contact', redirect: () => ({ path: '/', hash: '#contact' }) },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('./views/Terms.vue'),
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('./views/Privacy.vue'),
  },
  // {
  //   path: '/shop',
  //   name: 'Shop',
  //   component: () => import('./views/Shop.vue'),
  // },
  // {
  //   path: '/cart',
  //   name: 'Cart',
  //   component: () => import('./views/Cart.vue'),
  // },
  {
    path: '/x/outpostAdmin/login',
    name: 'AdminLogin',
    component: () => import('./views/admin/AdminLogin.vue'),
  },
  {
    path: '/x/outpostAdmin',
    name: 'AdminDashboard',
    component: () => import('./views/admin/AdminDashboard.vue'),
  },
  {
    path: '/x/outpostAdmin/events',
    name: 'AdminEvents',
    component: () => import('./views/admin/AdminEvents.vue'),
  },
  {
    path: '/x/outpostAdmin/events/add',
    name: 'AdminEventsAdd',
    component: () => import('./views/admin/AdminEventsAdd.vue'),
  },
  {
    path: '/x/outpostAdmin/featured-items',
    name: 'AdminFeaturedItems',
    component: () => import('./views/admin/AdminFeaturedItems.vue'),
  },
  {
    path: '/x/outpostAdmin/featured-items/add',
    name: 'AdminFeaturedItemsAdd',
    component: () => import('./views/admin/AdminFeaturedItemsAdd.vue'),
  },
  {
    path: '/x/outpostAdmin/products',
    name: 'AdminProducts',
    component: () => import('./views/admin/AdminProducts.vue'),
  },
  {
    path: '/x/outpostAdmin/products/add',
    name: 'AdminProductsAdd',
    component: () => import('./views/admin/AdminProductsAdd.vue'),
  },
  {
    path: '/x/outpostAdmin/tcgplayer',
    name: 'AdminTCGPlayer',
    component: () => import('./views/admin/AdminTCGPlayerPage.vue'),
  },
  {
    path: '/x/outpostAdmin/tcgplayer/add',
    name: 'AdminTCGPlayerAdd',
    component: () => import('./views/admin/AdminTCGPlayerAdd.vue'),
  },
  {
    path: '/x/outpostAdmin/square-stock',
    name: 'AdminSquareStock',
    component: () => import('./views/admin/AdminSquareStock.vue'),
  },
  {
    path: '/x/outpostAdmin/square-catalog',
    name: 'AdminSquareCatalog',
    component: () => import('./views/admin/AdminSquareCatalog.vue'),
  },
  {
    path: '/x/outpostAdmin/square-sales',
    name: 'AdminSquareSales',
    component: () => import('./views/admin/AdminSquareSales.vue'),
  },
  {
    path: '/x/outpostAdmin/square-mass-inventory',
    name: 'AdminSquareMassInventory',
    component: () => import('./views/admin/AdminSquareMassInventory.vue'),
  },
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    // A hash target means in-page section navigation — let useSectionNav's
    // manual scrollIntoView own it instead of racing against this.
    if (to.hash) return false
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

// Create Pinia instance
const pinia = createPinia()

// Gate every admin route behind a login check (except the login page itself)
router.beforeEach(async to => {
  if (!to.path.startsWith('/x/outpostAdmin') || to.name === 'AdminLogin') return true

  const auth = useAuthStore(pinia)
  if (!auth.checked) await auth.initAuth()
  if (!auth.username) return { name: 'AdminLogin', query: { redirect: to.fullPath } }
  return true
})

// Create and mount the Vue app
const head = createHead()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(head)
app.mount('#app')
