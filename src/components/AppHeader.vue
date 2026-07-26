<template>
  <header class="bg-gray-800 text-white shadow-lg sticky top-0 z-50">
    <nav class="container mx-auto px-4 py-4">
      <div class="hidden md:flex md:justify-between items-center">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-4">
          <img
            src="/src/assets/outpost_text_only.png"
            alt="The Outpost Games Logo"
            class="h-12 w-auto max-w-[220px] object-contain"
          />
        </div>

        <!-- Desktop Navigation - Right aligned -->
        <div class="flex space-x-10">
          <template v-for="link in navLinks" :key="link.name">
            <router-link
              v-if="link.path"
              :to="link.path"
              class="hover:text-outpost-gold transition-colors duration-200 font-semibold text-lg"
              :class="{ 'text-outpost-gold': route.path === link.path }"
            >
              {{ link.name }}
            </router-link>
            <a
              v-else
              :href="`/#${link.sectionId}`"
              class="hover:text-outpost-gold transition-colors duration-200 font-semibold text-lg"
              :class="{ 'text-outpost-gold': isActiveSection(link.sectionId) }"
              @click.prevent="goToSection(link.sectionId)"
            >
              {{ link.name }}
            </a>
          </template>
        </div>
      </div>

      <!-- Mobile Layout -->
      <div class="md:hidden flex flex-col items-center gap-4">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-4">
          <img
            src="/src/assets/outpost_text_only.png"
            alt="The Outpost Games Logo"
            class="h-12 w-auto max-w-[220px] object-contain"
            fetchpriority="high"
          />
        </div>

        <!-- Mobile Menu Button -->
        <button
          class="absolute right-4 top-4 hover:text-outpost-gold transition-colors duration-200"
          :aria-label="showMobileMenu ? 'Close menu' : 'Open menu'"
          :aria-expanded="showMobileMenu"
          @click="toggleMobileMenu"
        >
          <Bars3Icon v-if="!showMobileMenu" class="w-6 h-6" />
          <XMarkIcon v-else class="w-6 h-6" />
        </button>
      </div>

      <!-- Mobile Navigation -->
      <div
        v-if="showMobileMenu"
        class="md:hidden absolute left-0 right-0 top-full bg-gray-800 border-t border-gray-600 shadow-xl z-40"
      >
        <div class="flex flex-col space-y-3 px-4 py-4">
          <template v-for="link in navLinks" :key="link.name">
            <router-link
              v-if="link.path"
              :to="link.path"
              class="hover:text-outpost-gold transition-colors duration-200 font-medium py-2"
              :class="{ 'text-outpost-gold': route.path === link.path }"
              @click="showMobileMenu = false"
            >
              {{ link.name }}
            </router-link>
            <a
              v-else
              :href="`/#${link.sectionId}`"
              class="hover:text-outpost-gold transition-colors duration-200 font-medium py-2"
              :class="{ 'text-outpost-gold': isActiveSection(link.sectionId) }"
              @click.prevent="goToMobileSection(link.sectionId)"
            >
              {{ link.name }}
            </a>
          </template>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useSectionNav } from '../composables/useSectionNav'

const router = useRouter()
const route = useRoute()
const { goToSection } = useSectionNav()

const showMobileMenu = ref(false)

interface NavLink {
  name: string
  path?: string
  sectionId?: string
}

const navLinks: NavLink[] = [
  { name: 'Home', path: '/' },
  { name: 'Products', path: '/products' },
  { name: 'Events', path: '/events' },
  { name: 'About', sectionId: 'about' },
  { name: 'Contact', sectionId: 'contact' },
]

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const goToMobileSection = (sectionId: string | undefined) => {
  goToSection(sectionId)
  showMobileMenu.value = false
}

// Close mobile menu when route changes
router.beforeEach(() => {
  showMobileMenu.value = false
})

// ── Scroll-spy: highlights the in-page section nav link matching whatever
// section is currently in view on the one-page Home. Only meaningful on '/' —
// other routes have none of these section ids in the DOM at all.
const activeSection = ref<string | null>(null)
const isActiveSection = (sectionId?: string) =>
  route.path === '/' && sectionId !== undefined && activeSection.value === sectionId

const sectionIds = ['about', 'community', 'contact']
let observer: IntersectionObserver | null = null

const teardownScrollSpy = () => {
  observer?.disconnect()
  observer = null
  activeSection.value = null
}

// AppHeader's onMounted fires as soon as App.vue mounts, which is BEFORE
// <router-view> renders its initial matched component — the router's global
// beforeEach guard is declared `async`, so even a same-tick `return true`
// makes navigation resolution (and therefore Home's mount) land a tick later.
// Retry until the section elements actually exist rather than assuming one
// nextTick is enough — covers both that gap and the async home-sections
// (defineAsyncComponent/Suspense) still resolving.
let scrollSpySetupAttempts = 0

const setupScrollSpy = () => {
  teardownScrollSpy()
  if (route.path !== '/') return

  const foundEls = sectionIds
    .map(id => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null)

  if (foundEls.length === 0 && scrollSpySetupAttempts < 10) {
    scrollSpySetupAttempts += 1
    setTimeout(setupScrollSpy, 150)
    return
  }
  scrollSpySetupAttempts = 0

  // Top inset clears the sticky header; a large negative bottom inset shrinks
  // the observed band down to just the top ~30% of the viewport, so a section
  // is "active" as soon as it reaches that band and stays active — rather
  // than flipping back to nothing — until the next section reaches it too.
  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeSection.value = entry.target.id
      }
    },
    { rootMargin: '-96px 0px -70% 0px' }
  )
  for (const el of foundEls) observer.observe(el)
}

onMounted(() => {
  setupScrollSpy()
})

watch(
  () => route.path,
  () => {
    nextTick(setupScrollSpy)
  }
)

onBeforeUnmount(teardownScrollSpy)
</script>
