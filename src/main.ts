import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'

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

// Create and mount the Vue app
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
