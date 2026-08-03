<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-12">
          <h1 class="font-cinzel text-4xl font-bold text-gray-800">Admin Dashboard</h1>
          <div class="flex items-center gap-3">
            <span v-if="auth.username" class="text-sm text-gray-500"
              >Signed in as {{ auth.username }}</span
            >
            <button class="btn-secondary px-4 py-2" @click="handleLogout">Log Out</button>
          </div>
        </div>

        <!-- Events -->
        <div class="mb-10">
          <h2
            class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1"
          >
            Events
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link
              :to="{ name: 'AdminEvents' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Events</h3>
                <p class="text-gray-500 text-sm">Edit and delete tournament events</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminEventsAdd' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Event</h3>
                <p class="text-gray-500 text-sm">Create a new tournament or special event</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Products -->
        <div class="mb-10">
          <h2
            class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1"
          >
            Products
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link
              :to="{ name: 'AdminProducts' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-outpost-navy rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-outpost-gold"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Products</h3>
                <p class="text-gray-500 text-sm">Edit visibility, prices, and descriptions</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminProductsAdd' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-outpost-gold rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-outpost-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Products</h3>
                <p class="text-gray-500 text-sm">Add new game types, sets, or products</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Single Card Listings -->
        <div class="mb-10">
          <h2
            class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1"
          >
            Single Card Listings
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link
              :to="{ name: 'AdminTCGPlayer' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Listings</h3>
                <p class="text-gray-500 text-sm">Edit and delete featured single cards</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminTCGPlayerAdd' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Listing</h3>
                <p class="text-gray-500 text-sm">Add a new single card to the listings</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Square POS -->
        <div class="mb-10">
          <h2
            class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1"
          >
            Square POS
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link
              :to="{ name: 'AdminSquareStock' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 17V9m4 8V5m4 12v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Stock Report</h3>
                <p class="text-gray-500 text-sm">View and export live Square inventory</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminSquareCatalog' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Catalog Editor</h3>
                <p class="text-gray-500 text-sm">Edit product details in Square POS</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminSquareSales' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Sales Over Time</h3>
                <p class="text-gray-500 text-sm">Chart revenue trends and top products</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminSquareMassInventory' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4h16v4H4V4zm0 6h16v10H4V10zm4 3h8"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Mass Inventory Update</h3>
                <p class="text-gray-500 text-sm">Correct many stock counts in one save</p>
              </div>
            </router-link>

            <router-link
              :to="{ name: 'AdminSquareRestock' }"
              class="card hover:shadow-xl transition-all duration-300"
            >
              <div class="text-center">
                <div
                  class="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <svg
                    class="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 100 4 2 2 0 000-4z"
                    />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Quick Restock</h3>
                <p class="text-gray-500 text-sm">Open a box, restock loose packs in one click</p>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const handleLogout = async () => {
  await auth.logout()
  router.push({ name: 'AdminLogin' })
}
</script>
