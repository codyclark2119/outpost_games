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

    <div v-if="catalogStore.error && !hasCatalog" class="page-shell py-4">
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
              buyable
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
                buyable
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MagnifyingGlassIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import { useSquareCatalogStore, matchesSearch, slugify } from '../stores/squareCatalog'
import { gameMeta } from '../config/games'
import { usePageMeta } from '../composables/usePageMeta'
import PageHeader from '../components/PageHeader.vue'
import GameNav from '../components/GameNav.vue'
import ProductCard from '../components/ProductCard.vue'
import ProductGridSkeleton from '../components/ProductGridSkeleton.vue'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

usePageMeta({
  title: 'Products — The Outpost Games',
  description:
    'In-stock sealed product for Magic, Pokémon, One Piece, Gundam, and Riftbound at The Outpost Games in Rio Grande City, TX.',
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

onMounted(() => {
  catalogStore.ensureCatalog()
})
</script>
