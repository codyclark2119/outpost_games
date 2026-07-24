<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
    <!-- Sidebar Toggle -->
    <button
      class="fixed top-20 left-4 z-40 bg-outpost-gold text-outpost-black p-3 rounded-full shadow-lg hover:bg-outpost-gold-light transition-colors"
      aria-label="Toggle Navigation"
      @click="sidebarOpen = !sidebarOpen"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <!-- Sidebar -->
    <aside
      class="fixed top-20 left-0 h-[calc(100vh-5rem)] bg-white shadow-xl z-30 transition-transform duration-300 w-64 overflow-y-auto"
      :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }"
    >
      <div class="p-6">
        <h2 class="font-cinzel text-xl font-bold text-gray-800 mb-6">Quick Navigation</h2>
        <nav class="space-y-1">
          <template v-if="PRODUCTS_CATALOG_LIVE">
            <button
              v-for="type in visibleTypes"
              :key="type.id"
              class="w-full text-left px-4 py-3 rounded-lg hover:bg-outpost-gold/10 transition-colors font-semibold text-gray-700 hover:text-outpost-gold text-sm"
              @click="scrollToSection(type.id)"
            >
              {{ type.name }}
            </button>
          </template>
          <button
            class="w-full text-left px-4 py-3 rounded-lg hover:bg-outpost-gold/10 transition-colors font-semibold text-gray-700 hover:text-outpost-gold text-sm"
            @click="scrollToSection('single-cards')"
          >
            Featured Single Cards
          </button>
        </nav>
      </div>
    </aside>

    <!-- Overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/50 z-20"
      @click="sidebarOpen = false"
    ></div>

    <!-- Main Content -->
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12 hero-content">
          <h1
            class="font-cinzel text-4xl md:text-5xl font-bold mb-4 text-gray-800 section-heading inline-block"
          >
            Available Products
          </h1>
          <p class="text-center text-gray-600 text-lg">
            Click on a set to view products currently available in store
          </p>
        </div>

        <!-- Loading -->
        <div v-if="PRODUCTS_CATALOG_LIVE && productsStore.loading" class="text-center py-20">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-outpost-gold"
          ></div>
          <p class="mt-4 text-gray-600">Loading products…</p>
        </div>

        <ComingSoonPanel v-else-if="!PRODUCTS_CATALOG_LIVE" class="mb-20" />

        <!-- Game type sections -->
        <template v-else>
          <section
            v-for="type in visibleTypes"
            :id="type.id"
            :key="type.id"
            class="mb-20 scroll-mt-24"
          >
            <!-- Section header with View All link -->
            <div class="flex items-end justify-between mb-8">
              <h2 class="font-cinzel text-3xl md:text-4xl font-bold text-gray-800 section-heading">
                {{ type.name }}
              </h2>
              <router-link
                v-if="visibleSets(type).length > 0"
                :to="`/products/${type.id}`"
                class="text-outpost-gold hover:text-outpost-gold-dark font-semibold text-sm flex items-center gap-1 transition-colors mb-2"
              >
                View All
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </router-link>
            </div>

            <div v-if="visibleSets(type).length === 0" class="text-center text-gray-400 py-8">
              No products available right now — check back soon!
            </div>

            <!-- Carousel -->
            <div v-else class="relative">
              <!-- Prev arrow -->
              <button
                v-if="getCarouselIndex(type.id) > 0"
                class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:border-outpost-gold hover:text-outpost-gold transition-all"
                aria-label="Previous"
                @click="carouselPrev(type.id)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <!-- Set cards window -->
              <transition name="carousel-slide" mode="out-in">
                <div
                  :key="`${type.id}-${getCarouselIndex(type.id)}`"
                  class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5"
                >
                  <router-link
                    v-for="(set, si) in visibleSets(type).slice(
                      getCarouselIndex(type.id),
                      getCarouselIndex(type.id) + CAROUSEL_SIZE
                    )"
                    :key="set.id"
                    :to="`/products/${type.id}?set=${set.id}`"
                    class="product-card block"
                    :style="{ animationDelay: `${si * 0.06}s` }"
                  >
                    <div
                      class="bg-white rounded-xl shadow-lg p-5 hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative overflow-hidden group border border-transparent hover:border-outpost-gold"
                    >
                      <div
                        class="shimmer-overlay absolute inset-0 bg-gradient-to-r from-transparent via-outpost-gold/10 to-transparent -translate-x-full group-hover:translate-x-full"
                      ></div>

                      <div
                        class="aspect-square flex items-center justify-center mb-3 flex-shrink-0 relative z-10"
                      >
                        <img
                          v-if="set.imageUrl"
                          :src="set.imageUrl"
                          :alt="set.name"
                          class="product-image w-28 h-28 object-contain"
                          loading="lazy"
                          width="160"
                          height="160"
                        />
                        <div
                          v-else
                          class="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400"
                        >
                          <svg
                            class="w-12 h-12"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.5"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                      </div>

                      <div class="flex-grow flex flex-col justify-center relative z-10">
                        <h3
                          class="font-cinzel font-semibold text-center text-gray-800 text-xs md:text-sm group-hover:text-outpost-gold transition-colors duration-300 leading-tight"
                        >
                          {{ set.name }}
                        </h3>
                        <p
                          class="text-center text-xs text-outpost-gold font-medium mt-2 px-2 py-1 bg-outpost-gold/10 rounded-full inline-block mx-auto"
                        >
                          {{
                            visibleProducts(set).length > 0
                              ? `${visibleProducts(set).length} in stock`
                              : 'View'
                          }}
                        </p>
                      </div>
                    </div>
                  </router-link>
                </div>
              </transition>

              <!-- Next arrow -->
              <button
                v-if="getCarouselIndex(type.id) + CAROUSEL_SIZE < visibleSets(type).length"
                class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:border-outpost-gold hover:text-outpost-gold transition-all"
                aria-label="Next"
                @click="carouselNext(type.id, visibleSets(type).length)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              <!-- Dot indicators (shown only when carousel is active) -->
              <div
                v-if="visibleSets(type).length > CAROUSEL_SIZE"
                class="flex justify-center gap-1.5 mt-4"
              >
                <button
                  v-for="page in Math.ceil(visibleSets(type).length / CAROUSEL_SIZE)"
                  :key="page"
                  class="w-2 h-2 rounded-full transition-all"
                  :class="currentPage(type.id) === page - 1 ? 'bg-outpost-gold w-5' : 'bg-gray-300'"
                  :aria-label="`Page ${page}`"
                  @click="carouselGoTo(type.id, (page - 1) * CAROUSEL_SIZE)"
                ></button>
              </div>
            </div>
          </section>
        </template>

        <!-- Featured Single Cards Section — independent of the manual catalog, always live -->
        <!-- <section id="single-cards" class="mb-20 scroll-mt-24">
          <div class="text-center mb-12">
            <h2
              class="font-cinzel text-3xl md:text-4xl font-bold mb-4 text-gray-800 section-heading inline-block"
            >
              Featured Single Cards
            </h2>
            <p class="text-gray-600 text-lg">Premium cards available for online purchase</p>
          </div>

          <div v-if="loadingListings" class="text-center py-12">
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-outpost-gold"
            ></div>
          </div>

          <div v-else-if="listingsError" class="text-center py-12">
            <p class="text-red-600 mb-4">{{ listingsError }}</p>
            <button class="btn-primary px-6 py-3" @click="fetchTCGPlayerListings">Try Again</button>
          </div>

          <div v-else-if="cardListings.length === 0" class="text-center py-12">
            <p class="text-gray-600">No listings available at this time.</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <a
              v-for="(card, index) in cardListings"
              :key="card.id"
              :href="card.productUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="card-listing block"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div
                class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full border border-gray-200 hover:border-outpost-gold group"
              >
                <div class="card-image-container relative overflow-hidden bg-gray-100">
                  <img
                    v-if="card.imageUrl"
                    :src="card.imageUrl"
                    :alt="card.name"
                    class="card-image w-full object-cover object-top"
                    loading="lazy"
                  />
                  <div
                    v-if="card.imageUrl && card.quantityInStock"
                    class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded"
                  >
                    {{ card.quantityInStock }}
                    {{ card.quantityInStock === 1 ? 'left' : 'in stock' }}
                  </div>
                  <div
                    v-if="!card.imageUrl"
                    class="absolute inset-0 flex items-center justify-center bg-gray-200"
                  >
                    <span class="text-gray-400 text-sm">No Image</span>
                  </div>
                </div>
                <div class="p-4 flex flex-col flex-grow">
                  <h3 class="font-bold text-gray-900 text-lg mb-1 line-clamp-2">{{ card.name }}</h3>
                  <p class="text-gray-600 text-sm mb-3 line-clamp-1" :title="card.setName">
                    {{ card.setName }}
                  </p>
                  <div class="mb-3">
                    <span
                      class="condition-badge inline-block px-3 py-1 rounded-full text-white text-sm font-semibold"
                      :class="{
                        'bg-green-500': card.condition === 'NM',
                        'bg-blue-500': card.condition === 'LP',
                        'bg-orange-500': card.condition === 'MP',
                        'bg-red-500': card.condition === 'HP',
                      }"
                    >
                      {{ card.foiling }} / {{ card.condition }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center mb-4">
                    <span class="text-2xl font-bold text-gray-900">
                      {{ card.priceDisplay || `$${card.price.toFixed(2)}` }}
                    </span>
                  </div>
                  <div
                    class="tcgplayer-button block w-full text-center bg-outpost-navy hover:bg-outpost-navy/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300 mt-auto"
                  >
                    View on TCGPlayer →
                  </div>
                </div>
              </div>
            </a>
          </div>
        </section> -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductsStore, type ProductType, type ProductSet } from '../stores/products'
import { PRODUCTS_CATALOG_LIVE } from '../config/featureFlags'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

const productsStore = useProductsStore()

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Filtered views
const visibleTypes = computed(() =>
  productsStore.catalog.types.filter(t => t.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
)
const visibleSets = (type: ProductType) =>
  type.sets.filter(s => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)

const visibleProducts = (set: ProductSet) =>
  set.products.filter(p => p.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)

// Carousel state — tracks the first visible index per game type
const CAROUSEL_SIZE = 5
const carouselIndexes = ref<Record<string, number>>({})

const getCarouselIndex = (typeId: string) => carouselIndexes.value[typeId] ?? 0

const carouselPrev = (typeId: string) => {
  carouselIndexes.value[typeId] = Math.max(0, getCarouselIndex(typeId) - 1)
}
const carouselNext = (typeId: string, totalSets: number) => {
  carouselIndexes.value[typeId] = Math.min(totalSets - CAROUSEL_SIZE, getCarouselIndex(typeId) + 1)
}
const carouselGoTo = (typeId: string, index: number) => {
  carouselIndexes.value[typeId] = index
}
const currentPage = (typeId: string) => Math.floor(getCarouselIndex(typeId) / CAROUSEL_SIZE)

// Sidebar
const sidebarOpen = ref(false)
const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  sidebarOpen.value = false
}

// TCGPlayer listings
interface CardListing {
  id: string
  name: string
  setName: string
  imageUrl?: string
  foiling: string
  condition: string
  price: number
  priceDisplay: string
  quantityInStock: number
  productUrl: string
}
const cardListings = ref<CardListing[]>([])
const loadingListings = ref(false)
const listingsError = ref<string | null>(null)

const fetchTCGPlayerListings = async () => {
  loadingListings.value = true
  listingsError.value = null
  try {
    const response = await fetch(`${API_BASE_URL}/tcgplayer-listings`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    cardListings.value = data.listings || []
  } catch (error) {
    console.error('TCGPlayer listings fetch error:', error)
    listingsError.value = 'Failed to load card listings.'
  } finally {
    loadingListings.value = false
  }
}

onMounted(() => {
  if (PRODUCTS_CATALOG_LIVE) productsStore.fetchCatalog()
  fetchTCGPlayerListings()
})
</script>

<style scoped>
.scroll-mt-24 {
  scroll-margin-top: 6rem;
}

.carousel-slide-enter-active,
.carousel-slide-leave-active {
  transition: opacity 0.25s ease;
}
.carousel-slide-enter-from,
.carousel-slide-leave-to {
  opacity: 0;
}

aside {
  border-right: 2px solid #f3f4f6;
}

.hero-content {
  animation: fadeInUp 0.8s ease-out;
  will-change: transform, opacity;
}

.section-heading {
  position: relative;
  animation: fadeInUp 0.8s ease-out;
}

.section-heading::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: linear-gradient(to right, transparent, #d4af37, transparent);
  animation: expandWidth 0.8s ease-out 0.3s both;
}

@keyframes expandWidth {
  from {
    width: 0%;
  }
  to {
    width: 60%;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate3d(0, 30px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

.product-card {
  animation: fadeInUp 0.6s ease-out both;
  backface-visibility: hidden;
}
.product-card:hover {
  transform: translate3d(0, -8px, 0);
}

.card-listing {
  animation: fadeInUp 0.6s ease-out both;
  backface-visibility: hidden;
}
.card-listing:hover {
  transform: translate3d(0, -4px, 0);
}

.card-image-container {
  aspect-ratio: 5 / 4;
  position: relative;
}
.card-image {
  height: 150%;
  object-position: top center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.group:hover .card-image {
  transform: scale(1.05);
}

.condition-badge {
  transition: transform 0.3s ease;
}
.card-listing:hover .condition-badge {
  transform: scale(1.05);
}

.tcgplayer-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.tcgplayer-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.shimmer-overlay {
  pointer-events: none;
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.group:hover .shimmer-overlay {
  transform: translate3d(100%, 0, 0);
}

.product-image {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
@media (hover: hover) and (pointer: fine) {
  .group:hover .product-image {
    transform: scale(1.1) rotate(3deg);
  }
}

.modal-enter-active {
  transition: opacity 0.3s ease-out;
}
.modal-leave-active {
  transition: opacity 0.25s ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-header {
  animation: slideDown 0.4s ease-out;
}
.modal-footer {
  animation: fadeInUp 0.5s ease-out 0.1s both;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate3d(0, -15px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .shimmer-overlay {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-content,
  .product-card,
  .card-listing {
    animation-duration: 0.4s;
  }
  .shimmer-overlay {
    display: none;
  }
}
</style>
