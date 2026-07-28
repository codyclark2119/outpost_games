<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-7xl mx-auto">
        <!-- Manual catalog retired — coming soon until Square inventory is ready -->
        <template v-if="!PRODUCTS_CATALOG_LIVE">
          <router-link
            to="/products"
            class="text-outpost-gold hover:text-outpost-gold-dark text-sm font-medium flex items-center gap-1 mb-6"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Products
          </router-link>
          <ComingSoonPanel />
        </template>

        <template v-else>
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <router-link
                to="/products"
                class="text-outpost-gold hover:text-outpost-gold-dark text-sm font-medium flex items-center gap-1 mb-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                All Products
              </router-link>
              <h1 class="font-cinzel text-4xl font-bold text-gray-800">{{ typeName }}</h1>
              <p class="text-gray-500 mt-1">
                {{ filteredProducts.length }} product{{ filteredProducts.length !== 1 ? 's' : '' }}
                available
              </p>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="productsStore.loading" class="text-center py-20">
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-outpost-gold"
            ></div>
          </div>

          <!-- Type not found -->
          <div v-else-if="!currentType" class="text-center py-20">
            <p class="text-gray-500 text-lg mb-4">Game type not found.</p>
            <router-link to="/products" class="btn-primary px-6 py-2"
              >← Back to Products</router-link
            >
          </div>

          <template v-else>
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- Filter / Sort panel -->
              <aside class="lg:w-56 flex-shrink-0">
                <div class="bg-white rounded-xl shadow border border-gray-200 p-5 sticky top-24">
                  <h2 class="font-cinzel font-bold text-gray-800 mb-4">Filter & Sort</h2>

                  <!-- Sort -->
                  <div class="mb-5">
                    <label
                      class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                      >Sort By</label
                    >
                    <select
                      v-model="sortBy"
                      class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-outpost-navy"
                    >
                      <option value="default">Default</option>
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                      <option value="price-asc">Price Low–High</option>
                      <option value="price-desc">Price High–Low</option>
                      <option value="set-asc">Set Name A–Z</option>
                    </select>
                  </div>

                  <!-- Price range -->
                  <div class="mb-5">
                    <label
                      class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                      >Price Range</label
                    >
                    <div class="flex gap-2 items-center">
                      <input
                        v-model.number="minPrice"
                        type="number"
                        min="0"
                        placeholder="Min"
                        class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-outpost-navy"
                      />
                      <span class="text-gray-400 text-sm">–</span>
                      <input
                        v-model.number="maxPrice"
                        type="number"
                        min="0"
                        placeholder="Max"
                        class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-outpost-navy"
                      />
                    </div>
                  </div>

                  <!-- Filter by set -->
                  <div>
                    <label
                      class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                      >Sets</label
                    >
                    <div class="space-y-2 max-h-56 overflow-y-auto">
                      <label
                        v-for="set in availableSets"
                        :key="set.id"
                        class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-outpost-gold transition-colors"
                      >
                        <input
                          v-model="selectedSetIds"
                          type="checkbox"
                          :value="set.id"
                          class="accent-outpost-navy rounded"
                        />
                        {{ set.name }}
                      </label>
                    </div>
                    <button
                      v-if="selectedSetIds.length > 0"
                      class="text-xs text-gray-400 hover:text-red-500 mt-2 transition-colors"
                      @click="selectedSetIds = []"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              </aside>

              <!-- Product grid -->
              <div class="flex-1 min-w-0">
                <!-- Empty state -->
                <div v-if="allProducts.length === 0" class="text-center py-16 text-gray-400">
                  <svg
                    class="w-16 h-16 mx-auto mb-4 opacity-30"
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
                  <p class="text-lg font-medium">No products in this category yet.</p>
                  <p class="text-sm mt-1">Check back soon or visit us in store!</p>
                </div>

                <div
                  v-else-if="filteredProducts.length === 0"
                  class="text-center py-16 text-gray-400"
                >
                  <p class="text-lg font-medium">No products match your filters.</p>
                  <button class="btn-primary px-5 py-2 mt-4 text-sm" @click="clearFilters">
                    Clear Filters
                  </button>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div
                    v-for="item in filteredProducts"
                    :key="item.product.id"
                    class="bg-white rounded-xl shadow border border-gray-200 hover:border-outpost-gold hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group"
                  >
                    <!-- Product image -->
                    <div
                      class="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        v-if="item.product.imageUrl"
                        :src="item.product.imageUrl"
                        :alt="item.product.name"
                        class="w-full h-full object-contain p-3 no-hover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div v-else class="text-gray-200 p-8">
                        <svg
                          class="w-14 h-14 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.5"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>

                    <!-- Info -->
                    <div class="p-4 flex flex-col flex-grow">
                      <!-- Set badge -->
                      <span
                        class="text-xs text-outpost-gold font-semibold bg-outpost-gold/10 px-2 py-0.5 rounded-full inline-block mb-2 self-start"
                      >
                        {{ item.setName }}
                      </span>
                      <h3 class="font-cinzel font-bold text-gray-800 mb-1 leading-tight">
                        {{ item.product.name }}
                      </h3>
                      <p
                        v-if="item.product.description"
                        class="text-sm text-gray-500 mb-3 flex-grow line-clamp-3"
                      >
                        {{ item.product.description }}
                      </p>
                      <div
                        v-if="item.product.price !== null"
                        class="mt-auto pt-2 border-t border-gray-100"
                      >
                        <span class="text-xl font-bold text-outpost-navy"
                          >${{ Number(item.product.price).toFixed(2) }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductsStore, type SetProduct } from '../stores/products'
import { PRODUCTS_CATALOG_LIVE } from '../config/featureFlags'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

const route = useRoute()
const productsStore = useProductsStore()

const typeId = computed(() => route.params.typeId as string)

const currentType = computed(
  () => productsStore.catalog.types.find(t => t.id === typeId.value && t.isVisible) ?? null
)

const typeName = computed(() => currentType.value?.name ?? '')

// All visible sets in this type
const availableSets = computed(() =>
  (currentType.value?.sets ?? []).filter(s => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
)

// Flat list of all visible products across visible sets
interface ProductItem {
  product: SetProduct
  setName: string
  setId: string
  sortOrder: number
}

const allProducts = computed((): ProductItem[] => {
  const items: ProductItem[] = []
  for (const set of availableSets.value) {
    for (const product of set.products) {
      if (product.isVisible) {
        items.push({ product, setName: set.name, setId: set.id, sortOrder: product.sortOrder })
      }
    }
  }
  return items
})

// Filter state — seeded from ?set=<setId> query param
const selectedSetIds = ref<string[]>([])
const minPrice = ref<number | null>(null)
const maxPrice = ref<number | null>(null)
const sortBy = ref('default')

watch(
  () => route.query.set,
  setParam => {
    selectedSetIds.value = typeof setParam === 'string' && setParam ? [setParam] : []
  },
  { immediate: true }
)

const clearFilters = () => {
  selectedSetIds.value = []
  minPrice.value = null
  maxPrice.value = null
  sortBy.value = 'default'
}

const filteredProducts = computed((): ProductItem[] => {
  let items = allProducts.value

  // Filter by set
  if (selectedSetIds.value.length > 0) {
    items = items.filter(i => selectedSetIds.value.includes(i.setId))
  }

  // Filter by price range
  if (minPrice.value !== null) {
    items = items.filter(i => i.product.price !== null && i.product.price >= (minPrice.value ?? 0))
  }
  if (maxPrice.value !== null) {
    items = items.filter(
      i => i.product.price !== null && i.product.price <= (maxPrice.value ?? Infinity)
    )
  }

  // Sort
  return [...items].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':
        return a.product.name.localeCompare(b.product.name)
      case 'name-desc':
        return b.product.name.localeCompare(a.product.name)
      case 'price-asc':
        return (a.product.price ?? Infinity) - (b.product.price ?? Infinity)
      case 'price-desc':
        return (b.product.price ?? -Infinity) - (a.product.price ?? -Infinity)
      case 'set-asc':
        return a.setName.localeCompare(b.setName)
      default:
        return a.sortOrder - b.sortOrder
    }
  })
})

onMounted(async () => {
  if (PRODUCTS_CATALOG_LIVE && productsStore.catalog.types.length === 0)
    await productsStore.fetchCatalog()
})
</script>

<style scoped>
.no-hover {
  transition: none !important;
}
</style>
