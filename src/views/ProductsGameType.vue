<template>
  <div class="pb-14">
    <div v-if="!PRODUCTS_CATALOG_LIVE" class="page-shell py-8">
      <ComingSoonPanel
        title="Our online catalog is getting a refresh"
        message="Live inventory isn't online just yet. Everything is still stocked in store — come see the full selection in person."
      />
    </div>

    <template v-else>
      <GameNav
        v-if="catalogStore.sections.length"
        :sections="catalogStore.sections"
        :active-slug="typeId"
      />

      <div class="page-shell">
        <header class="pt-6 pb-4 sm:pt-8">
          <p class="eyebrow">Products</p>
          <h1
            class="mt-2 flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-outpost-navy sm:text-4xl"
          >
            <span
              class="h-7 w-1.5 rounded-full"
              :style="{ backgroundColor: meta.accent }"
              aria-hidden="true"
            ></span>
            {{ meta.title }}
          </h1>
          <p v-if="currentSection" class="mt-1 text-slate-600">
            {{ currentSection.items.length }} item{{ currentSection.items.length === 1 ? '' : 's' }}
            in stock
          </p>
        </header>

        <ProductGridSkeleton v-if="catalogStore.loading && !catalogStore.items.length" />

        <div v-else-if="catalogStore.error && !catalogStore.items.length" class="card text-center">
          <p class="text-slate-600">Products are temporarily unavailable.</p>
          <button type="button" class="btn-secondary mt-4" @click="catalogStore.fetchCatalog">
            Try again
          </button>
        </div>

        <ComingSoonPanel v-else-if="!catalogStore.sections.length" />

        <div v-else-if="!currentSection" class="card text-center">
          <p class="font-medium text-slate-800">
            Nothing from {{ meta.title }} is in stock online.
          </p>
          <p class="mt-1 text-sm text-slate-600">
            Stock moves fast — check the other games or ask us in store.
          </p>
          <router-link to="/products" class="btn-secondary mt-4">Browse all games</router-link>
        </div>

        <template v-else>
          <!-- Search + sort -->
          <div class="flex gap-2">
            <label class="relative min-w-0 flex-1">
              <span class="sr-only">Search {{ meta.title }}</span>
              <MagnifyingGlassIcon
                class="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                v-model="query"
                type="search"
                :placeholder="`Search ${meta.label}`"
                class="form-input pl-11"
                enterkeyhint="search"
              />
            </label>
            <label class="shrink-0">
              <span class="sr-only">Sort</span>
              <select v-model="sortBy" class="form-input w-auto pr-8">
                <option value="newest">Newest</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="name-asc">A–Z</option>
              </select>
            </label>
          </div>

          <!-- Set filter -->
          <div
            v-if="currentSection.sets.length > 1"
            class="scroll-row mt-3"
            role="group"
            aria-label="Filter by set"
          >
            <button
              type="button"
              class="chip snap-start"
              :class="{ 'chip-active': !activeSet }"
              :aria-pressed="!activeSet"
              @click="selectedSet = null"
            >
              All sets
            </button>
            <button
              v-for="set in currentSection.sets"
              :key="set.slug"
              type="button"
              class="chip snap-start"
              :class="{ 'chip-active': activeSet?.slug === set.slug }"
              :aria-pressed="activeSet?.slug === set.slug"
              @click="selectedSet = set.slug"
            >
              {{ set.name }}
            </button>
          </div>

          <p v-if="isFiltered" class="mt-4 text-sm text-slate-600" aria-live="polite">
            Showing {{ filteredItems.length }} of {{ currentSection.items.length }}
            <button
              type="button"
              class="ml-2 font-semibold text-outpost-navy underline-offset-4 hover:underline"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </p>

          <div
            v-if="filteredItems.length"
            class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
          >
            <ProductCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
              :subtitle="activeSet ? null : item.setName"
            />
          </div>
          <div v-else class="card mt-4 text-center">
            <p class="font-medium text-slate-800">Nothing matches those filters.</p>
            <button type="button" class="btn-secondary mt-4" @click="clearFilters">
              Clear filters
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import {
  useSquareCatalogStore,
  matchesSearch,
  releaseMs,
  type SquarePublicItem,
} from '../stores/squareCatalog'
import { gameMeta } from '../config/games'
import { SITE_URL } from '../composables/usePageMeta'
import { PRODUCTS_CATALOG_LIVE } from '../config/featureFlags'
import GameNav from '../components/GameNav.vue'
import ProductCard from '../components/ProductCard.vue'
import ProductGridSkeleton from '../components/ProductGridSkeleton.vue'
import ComingSoonPanel from '../components/ComingSoonPanel.vue'

const route = useRoute()
const router = useRouter()
const catalogStore = useSquareCatalogStore()

const typeId = computed(() => route.params.typeId as string)
const currentSection = computed(() => catalogStore.sectionBySlug(typeId.value))
const meta = computed(() => gameMeta(typeId.value, currentSection.value?.name ?? typeId.value))

useHead(() => ({
  title: `${meta.value.title} — The Outpost Games`,
  meta: [
    {
      name: 'description',
      content: `In-stock ${meta.value.title} singles and sealed product at The Outpost Games in Rio Grande City, TX.`,
    },
  ],
  link: [{ rel: 'canonical', href: `${SITE_URL}/products/${typeId.value}` }],
}))

// Filters are seeded from the URL (?q=, ?set=, ?sort=) and mirrored back into
// it with router.replace, so a filtered view is shareable and survives a
// refresh or back-navigation.
const queryParam = (key: string) =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : null
const query = ref(queryParam('q') ?? '')
const sortBy = ref(queryParam('sort') ?? 'newest')
const selectedSet = ref<string | null>(queryParam('set'))

// GameNav switches games without remounting this view — start each game fresh.
watch(typeId, () => {
  query.value = ''
  sortBy.value = 'newest'
  selectedSet.value = null
})

watch([query, sortBy, selectedSet], () => {
  const next = { ...route.query }
  const assign = (key: string, value: string | null) => {
    if (value) next[key] = value
    else delete next[key]
  }
  assign('q', query.value.trim() || null)
  assign('sort', sortBy.value === 'newest' ? null : sortBy.value)
  assign('set', selectedSet.value)
  router.replace({ query: next })
})

// ?set= holds a set slug. Older shared links carried a raw Square category id
// instead, so an id that belongs to one of this game's sets resolves too.
const activeSet = computed(() => {
  const value = selectedSet.value
  if (!value) return null
  return (
    currentSection.value?.sets.find(set => set.slug === value || set.ids.includes(value)) ?? null
  )
})

const isFiltered = computed(() => Boolean(query.value.trim() || activeSet.value))

const clearFilters = () => {
  query.value = ''
  selectedSet.value = null
}

const filteredItems = computed((): SquarePublicItem[] => {
  let items = currentSection.value?.items ?? []
  const set = activeSet.value
  if (set) items = items.filter(item => item.setId !== null && set.ids.includes(item.setId))
  const term = query.value.trim()
  if (term) items = items.filter(item => matchesSearch(item, term))

  return [...items].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'price-asc':
        return (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
      case 'price-desc':
        return (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity)
      default:
        return releaseMs(b) - releaseMs(a)
    }
  })
})

onMounted(() => {
  if (PRODUCTS_CATALOG_LIVE) catalogStore.ensureCatalog()
})
</script>
