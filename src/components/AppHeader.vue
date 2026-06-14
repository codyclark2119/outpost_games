<template>
  <header class="bg-gray-800 text-white shadow-lg sticky top-0 z-50">
    <nav class="container mx-auto px-4 py-4">
      <div class="hidden md:flex md:justify-between items-center">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-4">
          <img
            src="/src/assets/outpost_text_only.png"
            alt="The Outpost Games Logo"
            class="w-12 h-12 rounded-lg object-contain"
          />
          <div>
            <h1 class="font-cinzel text-2xl font-bold text-gradient">The Outpost Games</h1>
            <p class="text-sm text-gray-300">Magic: The Gathering Hub</p>
          </div>
        </div>

        <!-- Desktop Navigation - Right aligned -->
        <div class="flex space-x-10">
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.path"
            class="hover:text-outpost-gold transition-colors duration-200 font-semibold text-lg"
            :class="{ 'text-outpost-gold': route.path === link.path }"
          >
            {{ link.name }}
          </router-link>
        </div>
      </div>

      <!-- Mobile Layout -->
      <div class="md:hidden flex flex-col items-center gap-4">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-4">
          <img
            src="/src/assets/logo.jpg"
            alt="The Outpost Games Logo"
            class="w-12 h-12 rounded-lg object-contain"
            fetchpriority="high"
            width="48"
            height="48"
          />
          <div>
            <h1 class="font-cinzel text-2xl font-bold text-gradient">The Outpost Games</h1>
            <p class="text-sm text-gray-300">Magic: The Gathering Hub</p>
          </div>
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
          <router-link
            v-for="link in navLinks"
            :key="link.name"
            :to="link.path"
            class="hover:text-outpost-gold transition-colors duration-200 font-medium py-2"
            :class="{ 'text-outpost-gold': route.path === link.path }"
            @click="showMobileMenu = false"
          >
            {{ link.name }}
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
// Removed cart store - informational site only

const router = useRouter()
const route = useRoute()
// const cartStore = useCartStore() // Removed - informational site only

const showMobileMenu = ref(false)

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Products', path: '/products' },
  { name: 'Events', path: '/events' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
]

// const cartItemCount = computed(() => cartStore.itemCount) // Removed - informational site only

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

// Close mobile menu when route changes
router.beforeEach(() => {
  showMobileMenu.value = false
})
</script>
