<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-7xl mx-auto">
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

        <ComingSoonPanel v-if="!PRODUCTS_CATALOG_LIVE" />

        <template v-else>
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 class="font-cinzel text-4xl font-bold text-gray-800">{{ typeName }}</h1>
              <p class="text-gray-500 mt-1">
                {{ filteredItems.length }} product{{ filteredItems.length !== 1 ? 's' : '' }}
                available
              </p>
            </div>
          </div>

          <!-- Loading -->
          <div
            v-if="catalogStore.loading && catalogStore.items.length === 0"
            class="text-center py-20"
          >
            <div
              class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-outpost-gold"
            ></div>
          </div>

          <!-- Type not found -->
          <div v-else-if="!currentSection" class="text-center py-20">
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
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                      <option value="price-asc">Price Low–High</option>
                      <option value="price-desc">Price High–Low</option>
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

                  <!-- Set (sub-category) filter — only shown when this game
                       type actually has sets, e.g. Magic's Bloomburrow,
                       Pre-cons, etc. -->
                  <div v-if="currentSection.sets.length > 0" class="mb-5">
                    <label
                      class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                      >Set</label
                    >
                    <select
                      v-model="selectedSet"
                      class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-outpost-navy"
                    >
                      <option :value="null">All Sets</option>
                      <option v-for="set in currentSection.sets" :key="set.id" :value="set.id">
                        {{ set.name }}
                      </option>
                    </select>
                  </div>

                  <button
                    v-if="minPrice !== null || maxPrice !== null || selectedSet !== null"
                    class="text-xs text-gray-400 hover:text-red-500 mt-4 transition-colors"
                    @click="clearFilters"
                  >
                    Clear filters
                  </button>
                </div>
              </aside>

              <!-- Product grid -->
              <div class="flex-1 min-w-0">
                <!-- Empty state -->
                <div
                  v-if="currentSection.items.length === 0"
                  class="text-center py-16 text-gray-400"
                >
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

                <div v-else-if="filteredItems.length === 0" class="text-center py-16 text-gray-400">
                  <p class="text-lg font-medium">No products match your filters.</p>
                  <button class="btn-primary px-5 py-2 mt-4 text-sm" @click="clearFilters">
                    Clear Filters
                  </button>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div
                    v-for="item in filteredItems"
                    :key="item.id"
                    class="bg-white rounded-xl shadow border border-gray-200 hover:border-outpost-gold hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group"
                  >
                    <!-- Product image -->
                    <div
                      class="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden"
                    >
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.name"
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
                      <h3 class="font-cinzel font-bold text-gray-800 mb-1 leading-tight">
                        {{ item.name }}
                      </h3>
                      <div class="mt-auto pt-2 border-t border-gray-100">
                        <span class="text-xl font-bold text-outpost-navy">{{
                          formatPrice(item)
                        }}</span>
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
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useSquareCatalogStore, type SquarePublicItem } from '../stores/squareCatalog'
import { SITE_URL } from '../composables/usePageMeta'
import { PRODUCTS_CATALOG_LIVE } from '../config/featureFlags'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

const route = useRoute()
const router = useRouter()
const catalogStore = useSquareCatalogStore()

const typeId = computed(() => route.params.typeId as string)

const currentSection = computed(() => catalogStore.sectionBySlug(typeId.value))
const typeName = computed(() => currentSection.value?.name ?? '')

useHead(() => ({
  title: typeName.value ? `${typeName.value} — The Outpost Games` : 'Products — The Outpost Games',
  meta: [
    {
      name: 'description',
      content: typeName.value
        ? `Browse ${typeName.value} singles and sealed product at The Outpost Games in Rio Grande City, TX.`
        : 'Browse products at The Outpost Games in Rio Grande City, TX.',
    },
  ],
  link: [{ rel: 'canonical', href: `${SITE_URL}/products/${typeId.value}` }],
}))

// Filter state
const minPrice = ref<number | null>(null)
const maxPrice = ref<number | null>(null)
const sortBy = ref('name-asc')
const selectedSet = ref<string | null>((route.query.set as string) || null)

// Deep-link support: reading route.query.set on mount (above) seeds the
// filter for a direct/shared link; this keeps the URL in sync afterward so
// the current filter is itself shareable/refreshable.
watch(selectedSet, value => {
  const query = { ...route.query }
  if (value) query.set = value
  else delete query.set
  router.replace({ query })
})

const formatPrice = (item: SquarePublicItem) =>
  item.priceCents != null ? `$${(item.priceCents / 100).toFixed(2)}` : 'See in store'

const clearFilters = () => {
  minPrice.value = null
  maxPrice.value = null
  sortBy.value = 'name-asc'
  selectedSet.value = null
}

const filteredItems = computed((): SquarePublicItem[] => {
  let items = currentSection.value?.items ?? []

  if (minPrice.value !== null) {
    items = items.filter(
      item => item.priceCents !== null && item.priceCents / 100 >= (minPrice.value ?? 0)
    )
  }
  if (maxPrice.value !== null) {
    items = items.filter(
      item => item.priceCents !== null && item.priceCents / 100 <= (maxPrice.value ?? Infinity)
    )
  }
  if (selectedSet.value !== null) {
    items = items.filter(item => item.setId === selectedSet.value)
  }

  return [...items].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'price-asc':
        return (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
      case 'price-desc':
        return (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity)
      default:
        return a.name.localeCompare(b.name)
    }
  })
})

onMounted(() => {
  if (PRODUCTS_CATALOG_LIVE && catalogStore.items.length === 0) catalogStore.fetchCatalog()
})
</script>

<style scoped>
.no-hover {
  transition: none !important;
}
</style>
