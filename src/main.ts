import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
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
  {
    path: '/about',
    name: 'About',
    component: () => import('./views/About.vue'),
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('./views/Contact.vue'),
  },
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
  scrollBehavior() {
    // Always scroll to top on navigation
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
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
