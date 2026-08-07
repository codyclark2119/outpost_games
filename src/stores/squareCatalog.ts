import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Every item returned by /api/square/public-catalog is already in stock —
// the backend filters out anything with zero on-hand quantity before this
// ever reaches the frontend, so there's no inStock flag to check here.
export interface SquarePublicItem {
  id: string
  itemId: string
  name: string
  priceCents: number | null
  currency: string | null
  imageUrl: string | null
  categoryId: string | null
  categoryName: string
  setId: string | null
  setName: string | null
  releasedAt: string | null
  itemCreatedAt: string | null
}

export interface CatalogSet {
  id: string
  name: string
}

export interface CatalogSection {
  slug: string
  name: string
  items: SquarePublicItem[]
  sets: CatalogSet[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Square category ids are opaque strings, unsuitable for a readable /products/:typeId
// URL — sections are addressed by a slug of their (admin-controlled, effectively
// stable) top-level category name instead.
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized'

export const useSquareCatalogStore = defineStore('squareCatalog', () => {
  const items = ref<SquarePublicItem[]>([])
  const fetchedAt = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCatalog = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/square/public-catalog`)
      if (!response.ok) throw new Error('Failed to fetch catalog')
      const data = await response.json()
      items.value = data.items || []
      fetchedAt.value = data.fetchedAt || null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch catalog'
    } finally {
      loading.value = false
    }
  }

  // Grouped by top-level category — this is the site's "game type" breakdown
  // (Magic, Pokémon, One Piece, etc.), sourced directly from however items are
  // categorized in Square rather than a separate hardcoded game-type list.
  // Section order is NOT re-sorted here — the API already returns items in
  // the desired category display order (pinned games first, Accessories
  // last, everything else by on-hand stock), and a Map preserves insertion
  // order, so just grouping in encounter order carries that through.
  const sections = computed<CatalogSection[]>(() => {
    const bySlug = new Map<string, CatalogSection>()
    const seenSetIdsBySlug = new Map<string, Set<string>>()
    for (const item of items.value) {
      const name = item.categoryName || 'Uncategorized'
      const slug = slugify(name)
      let section = bySlug.get(slug)
      if (!section) {
        section = { slug, name, items: [], sets: [] }
        bySlug.set(slug, section)
        seenSetIdsBySlug.set(slug, new Set())
      }
      section.items.push(item)

      // Distinct sets present in this section, first-seen order — powers the
      // "filter by set" dropdown on ProductsGameType.vue. Items with no set
      // (setId null) just don't contribute an option here.
      if (item.setId && item.setName) {
        const seenSetIds = seenSetIdsBySlug.get(slug)!
        if (!seenSetIds.has(item.setId)) {
          seenSetIds.add(item.setId)
          section.sets.push({ id: item.setId, name: item.setName })
        }
      }
    }
    return [...bySlug.values()]
  })

  const sectionBySlug = (slug: string) =>
    sections.value.find(section => section.slug === slug) ?? null

  return { items, fetchedAt, loading, error, fetchCatalog, sections, sectionBySlug }
})
