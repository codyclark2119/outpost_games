import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type FeaturedItemGameTag = 'magic' | 'pokemon' | 'onepiece' | 'gundam' | 'riftbound'

export interface FeaturedItem {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  linkTo: string
  linkText: string
  gameTag?: FeaturedItemGameTag
  isVisible: boolean
  sortOrder: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const useFeaturedItemsStore = defineStore('featuredItems', () => {
  const items = ref<FeaturedItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const visibleSorted = computed(() =>
    items.value.filter(i => i.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const fetchFeaturedItems = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/featured-items`)
      if (!response.ok) {
        throw new Error('Failed to fetch featured items')
      }
      const data = await response.json()
      items.value = data
    } catch (e) {
      console.error('Error fetching featured items:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch featured items'
    } finally {
      loading.value = false
    }
  }

  const addFeaturedItem = async (item: Omit<FeaturedItem, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/featured-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })
      if (!response.ok) {
        throw new Error('Failed to add featured item')
      }
      const newItem = await response.json()
      items.value.push(newItem)
    } catch (e) {
      console.error('Error adding featured item:', e)
      error.value = e instanceof Error ? e.message : 'Failed to add featured item'
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateFeaturedItem = async (id: string, updatedItem: Partial<FeaturedItem>) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/featured-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
      })
      if (!response.ok) {
        throw new Error('Failed to update featured item')
      }
      const updated = await response.json()
      const index = items.value.findIndex(i => i.id === id)
      if (index !== -1) {
        items.value[index] = updated
      }
    } catch (e) {
      console.error('Error updating featured item:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update featured item'
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteFeaturedItem = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/featured-items/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete featured item')
      }
      items.value = items.value.filter(i => i.id !== id)
    } catch (e) {
      console.error('Error deleting featured item:', e)
      error.value = e instanceof Error ? e.message : 'Failed to delete featured item'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    visibleSorted,
    fetchFeaturedItems,
    addFeaturedItem,
    updateFeaturedItem,
    deleteFeaturedItem,
  }
})
