<template>
  <div class="pb-14">
    <PageHeader
      eyebrow="Products"
      title="In stock now"
      subtitle="Live from our shelves — what you see here is in the shop today."
    >
      <label v-if="hasCatalog" class="relative mt-5 block max-w-xl">
        <span class="sr-only">Search products</span>
        <MagnifyingGlassIcon
          class="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          v-model="query"
          type="search"
          placeholder="Search booster boxes, decks, sets…"
          class="form-input pl-11"
          enterkeyhint="search"
        />
      </label>
    </PageHeader>

    <div v-if="!PRODUCTS_CATALOG_LIVE" class="page-shell py-4">
      <ComingSoonPanel
        title="Our online catalog is getting a refresh"
        message="Live inventory isn't online just yet. Everything is still stocked in store — come see the full selection in person."
      />
    </div>

    <div v-else-if="catalogStore.error && !hasCatalog" class="page-shell py-4">
      <div class="card text-center">
        <p class="text-slate-600">Products are temporarily unavailable.</p>
        <button type="button" class="btn-secondary mt-4" @click="catalogStore.fetchCatalog">
          Try again
        </button>
      </div>
    </div>

    <div v-else-if="catalogStore.loading && !hasCatalog" class="page-shell py-4">
      <ProductGridSkeleton />
    </div>

    <div v-else-if="!hasCatalog" class="page-shell py-4">
      <ComingSoonPanel />
    </div>

    <template v-else>
      <GameNav :sections="catalogStore.sections" />

      <div class="page-shell">
        <!-- Search across every game -->
        <section v-if="searchTerm" class="py-6" aria-live="polite">
          <p class="text-sm text-slate-600">
            {{ searchResults.length }} result{{ searchResults.length === 1 ? '' : 's' }} for
            <span class="font-semibold text-slate-800">“{{ searchTerm }}”</span>
          </p>
          <div
            v-if="searchResults.length"
            class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
          >
            <ProductCard
              v-for="item in searchResults"
              :key="item.id"
              :item="item"
              :subtitle="gameMeta(slugify(item.categoryName), item.categoryName).label"
            />
          </div>
          <div v-else class="card mt-4 text-center">
            <p class="font-medium text-slate-800">Nothing in stock matches that.</p>
            <p class="mt-1 text-sm text-slate-600">
              We may still be able to get it — ask us in store or on Discord.
            </p>
            <button type="button" class="btn-secondary mt-4" @click="query = ''">
              Clear search
            </button>
          </div>
        </section>

        <!-- One preview row per game -->
        <template v-else>
          <section
            v-for="section in catalogStore.sections"
            :key="section.slug"
            class="border-b border-slate-200 py-8 last:border-0"
          >
            <div class="flex items-end justify-between gap-4">
              <h2 class="flex items-center gap-3">
                <span
                  class="h-6 w-1.5 rounded-full"
                  :style="{ backgroundColor: gameMeta(section.slug, section.name).accent }"
                  aria-hidden="true"
                ></span>
                <span class="section-title">{{ gameMeta(section.slug, section.name).label }}</span>
              </h2>
              <router-link :to="`/products/${section.slug}`" class="text-link shrink-0">
                View all {{ section.items.length }}
                <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
              </router-link>
            </div>

            <!-- Swipeable row on phones/tablets; a plain 5-up grid on desktop -->
            <div class="scroll-row mt-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:px-0">
              <ProductCard
                v-for="(item, index) in section.items.slice(0, PREVIEW_COUNT)"
                :key="item.id"
                :item="item"
                :subtitle="item.setName"
                class="w-40 shrink-0 snap-start sm:w-48 lg:w-auto"
                :class="{ 'lg:hidden': index >= DESKTOP_PREVIEW_COUNT }"
              />
              <router-link
                v-if="section.items.length > PREVIEW_COUNT"
                :to="`/products/${section.slug}`"
                class="flex w-32 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-outpost-navy lg:hidden"
              >
                <ArrowRightIcon class="h-5 w-5" aria-hidden="true" />
                See all {{ section.items.length }}
              </router-link>
            </div>
          </section>
        </template>

        <!-- Featured single cards (TCGPlayer) — independent of the Square
             catalog and hidden until SINGLE_CARD_LISTINGS_LIVE is flipped. -->
        <section v-if="SINGLE_CARD_LISTINGS_LIVE" class="border-t border-slate-200 py-8">
          <h2 class="section-title">Featured single cards</h2>
          <p class="mt-1 text-slate-600">Premium singles available through TCGPlayer.</p>

          <ProductGridSkeleton v-if="loadingListings" class="mt-4" :count="5" />
          <p v-else-if="listingsError" class="mt-4 text-slate-600">
            {{ listingsError }}
            <button type="button" class="underline" @click="fetchTCGPlayerListings">
              Try again
            </button>
          </p>
          <p v-else-if="cardListings.length === 0" class="mt-4 text-slate-600">
            No listings available right now.
          </p>
          <div v-else class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            <a
              v-for="card in cardListings"
              :key="card.id"
              :href="card.productUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-outpost-navy/40"
            >
              <div class="aspect-[5/7] bg-slate-100">
                <img
                  v-if="card.imageUrl"
                  :src="card.imageUrl"
                  :alt="card.name"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="flex flex-1 flex-col gap-1 p-3">
                <p class="truncate text-[11px] font-semibold text-slate-500 uppercase">
                  {{ card.setName }}
                </p>
                <h3 class="line-clamp-2 text-sm font-medium text-slate-800">{{ card.name }}</h3>
                <p class="text-xs text-slate-500">{{ card.foiling }} · {{ card.condition }}</p>
                <p class="mt-auto pt-1 font-semibold text-outpost-navy">
                  {{ card.priceDisplay || `$${card.price.toFixed(2)}` }}
                </p>
              </div>
            </a>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import { apiFetch } from '../services/api'
import { useSquareCatalogStore, matchesSearch, slugify } from '../stores/squareCatalog'
import { gameMeta } from '../config/games'
import { usePageMeta } from '../composables/usePageMeta'
import { PRODUCTS_CATALOG_LIVE, SINGLE_CARD_LISTINGS_LIVE } from '../config/featureFlags'
import PageHeader from '../components/PageHeader.vue'
import GameNav from '../components/GameNav.vue'
import ProductCard from '../components/ProductCard.vue'
import ProductGridSkeleton from '../components/ProductGridSkeleton.vue'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

usePageMeta({
  title: 'Products — The Outpost Games',
  description:
    'In-stock singles and sealed product for Magic, Pokémon, One Piece, Gundam, and Riftbound at The Outpost Games in Rio Grande City, TX.',
  path: '/products',
})

// Items per game in the overview: the swipe row shows PREVIEW_COUNT, the
// desktop grid one row of DESKTOP_PREVIEW_COUNT. "View all" covers the rest.
const PREVIEW_COUNT = 10
const DESKTOP_PREVIEW_COUNT = 5

const route = useRoute()
const router = useRouter()
const catalogStore = useSquareCatalogStore()

const hasCatalog = computed(() => catalogStore.sections.length > 0)

// Search lives in ?q= so a result list survives back-navigation and can be shared.
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchTerm = computed(() => query.value.trim())
watch(searchTerm, value => {
  const next = { ...route.query }
  if (value) next.q = value
  else delete next.q
  router.replace({ query: next })
})
const searchResults = computed(() =>
  searchTerm.value ? catalogStore.items.filter(item => matchesSearch(item, searchTerm.value)) : []
)

// TCGPlayer listings (only fetched while SINGLE_CARD_LISTINGS_LIVE is on)
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
    const data = await apiFetch<{ listings: CardListing[] }>('/tcgplayer-listings')
    cardListings.value = data.listings || []
  } catch (error) {
    console.error('TCGPlayer listings fetch error:', error)
    listingsError.value = 'Failed to load card listings.'
  } finally {
    loadingListings.value = false
  }
}

onMounted(() => {
  if (PRODUCTS_CATALOG_LIVE) catalogStore.ensureCatalog()
  if (SINGLE_CARD_LISTINGS_LIVE) fetchTCGPlayerListings()
})
</script>
