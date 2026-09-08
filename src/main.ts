import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import './style.css'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import { ADMIN_BASE_PATH } from './config/adminPath'

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
    path: `${ADMIN_BASE_PATH}/login`,
    name: 'AdminLogin',
    component: () => import('./views/admin/AdminLogin.vue'),
  },
  {
    path: ADMIN_BASE_PATH,
    name: 'AdminDashboard',
    component: () => import('./views/admin/AdminDashboard.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/events`,
    name: 'AdminEvents',
    component: () => import('./views/admin/AdminEvents.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/events/add`,
    name: 'AdminEventsAdd',
    component: () => import('./views/admin/AdminEventsAdd.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/weekly-schedule`,
    name: 'AdminWeeklySchedule',
    component: () => import('./views/admin/AdminWeeklySchedule.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/tcgplayer`,
    name: 'AdminTCGPlayer',
    component: () => import('./views/admin/AdminTCGPlayerPage.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/tcgplayer/add`,
    name: 'AdminTCGPlayerAdd',
    component: () => import('./views/admin/AdminTCGPlayerAdd.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/square-stock`,
    name: 'AdminSquareStock',
    component: () => import('./views/admin/AdminSquareStock.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/square-catalog`,
    name: 'AdminSquareCatalog',
    component: () => import('./views/admin/AdminSquareCatalog.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/square-sales`,
    name: 'AdminSquareSales',
    component: () => import('./views/admin/AdminSquareSales.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/square-mass-inventory`,
    name: 'AdminSquareMassInventory',
    component: () => import('./views/admin/AdminSquareMassInventory.vue'),
  },
  {
    path: `${ADMIN_BASE_PATH}/square-restock`,
    name: 'AdminSquareRestock',
    component: () => import('./views/admin/AdminSquareRestock.vue'),
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
    // Explicitly instant, NOT inherited: html { scroll-behavior: smooth } in
    // style.css governs every scroll that doesn't say otherwise, and that is
    // what we want for in-page anchors. A route change is the opposite case
    // — smooth here animates the full height of the page being left before
    // the new one settles, so a click from deep in Home to /events reads as
    // a long stall. One mechanism per job: CSS for anchors, this for routes.
    return { top: 0, behavior: 'instant' }
  },
})

// Create Pinia instance
const pinia = createPinia()

// Gate every admin route behind a login check (except the login page itself)
router.beforeEach(async to => {
  if (!to.path.startsWith(ADMIN_BASE_PATH) || to.name === 'AdminLogin') return true

  const auth = useAuthStore(pinia)
  if (!auth.checked) await auth.initAuth()
  if (!auth.username) return { name: 'AdminLogin', query: { redirect: to.fullPath } }
  return true
})

// A tab left open across a deploy still has the old index.html's chunk
// references baked in — those hashed filenames (e.g. Events-3CqzmABZ.js) get
// deleted from the server the moment a new build replaces them, so the next
// lazy-loaded route 404s with "error loading dynamically imported module".
// The fix is a one-time hard reload to pick up the new index.html/chunk map,
// guarded by sessionStorage so a route that's genuinely broken (not just
// stale) doesn't reload forever.
const CHUNK_RELOAD_GUARD_KEY = 'outpost-chunk-reload-attempted'

const reloadOnStaleChunk = (path?: string) => {
  if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)) return
  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1')
  // Assigning location.href to a URL that differs from the current one only
  // by its fragment is a same-document scroll, NOT a reload — and the site's
  // own About/Contact links put the visitor on exactly such a URL ('/#about').
  // Reloading from there used to silently do nothing: the guard was spent,
  // the aborted navigation was never retried, and every later lazy route was
  // left dead until the visitor pressed refresh themselves.
  if (path && path !== window.location.pathname + window.location.search + window.location.hash) {
    window.location.assign(path)
  } else {
    window.location.reload()
  }
}

// Vite's own recommended hook for stale module-preload links. Deferred by a
// macrotask so router.onError below — which fires first, off the import's
// rejection microtask, and unlike this event knows where the visitor was
// actually headed — gets to spend the one-shot guard on the right URL.
window.addEventListener('vite:preloadError', () => {
  setTimeout(() => reloadOnStaleChunk(), 0)
})

router.onError((error, to) => {
  if (/dynamically imported module|Importing a module script failed/i.test(error.message)) {
    reloadOnStaleChunk(to.fullPath)
  }
})

router.afterEach(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
})

// Create and mount the Vue app
const head = createHead()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(head)
// Wait for initial guards and lazy route resolution so admin URLs never flash the public layout.
router.isReady().then(() => app.mount('#app'))
