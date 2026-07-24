import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SetProduct {
  id: string
  name: string
  description: string
  price: number | null
  imageUrl: string | null
  isVisible: boolean
  sortOrder: number
}

export interface ProductSet {
  id: string
  name: string
  imageUrl: string | null
  isVisible: boolean
  sortOrder: number
  products: SetProduct[]
}

export interface ProductType {
  id: string
  name: string
  isVisible: boolean
  sortOrder: number
  sets: ProductSet[]
}

export interface ProductCatalog {
  types: ProductType[]
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const useProductsStore = defineStore('products', () => {
  const catalog = ref<ProductCatalog>({ types: [] })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCatalog = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/products`)
      if (!response.ok) throw new Error('Failed to fetch catalog')
      catalog.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch catalog'
    } finally {
      loading.value = false
    }
  }

  // Types
  const addType = async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/products/types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error('Failed to add type')
    const newType: ProductType = await response.json()
    catalog.value.types.push(newType)
    return newType
  }

  const updateType = async (typeId: string, updates: Partial<Omit<ProductType, 'sets'>>) => {
    const response = await fetch(`${API_BASE_URL}/products/types/${typeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update type')
    const updated: ProductType = await response.json()
    const target = catalog.value.types.find(t => t.id === typeId)
    if (target) Object.assign(target, updated)
    return updated
  }

  const deleteType = async (typeId: string) => {
    const response = await fetch(`${API_BASE_URL}/products/types/${typeId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete type')
    catalog.value.types = catalog.value.types.filter(t => t.id !== typeId)
  }

  // Sets
  const addSet = async (typeId: string, data: { name: string; imageUrl?: string }) => {
    const response = await fetch(`${API_BASE_URL}/products/types/${typeId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to add set')
    const newSet: ProductSet = await response.json()
    const type = catalog.value.types.find(t => t.id === typeId)
    if (type) type.sets.push(newSet)
    return newSet
  }

  const updateSet = async (setId: string, updates: Partial<Omit<ProductSet, 'products'>>) => {
    const response = await fetch(`${API_BASE_URL}/products/sets/${setId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update set')
    const updated: ProductSet = await response.json()
    for (const type of catalog.value.types) {
      const target = type.sets.find(s => s.id === setId)
      if (target) {
        Object.assign(target, updated)
        break
      }
    }
    return updated
  }

  const deleteSet = async (setId: string) => {
    const response = await fetch(`${API_BASE_URL}/products/sets/${setId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete set')
    for (const type of catalog.value.types) {
      type.sets = type.sets.filter(s => s.id !== setId)
    }
  }

  // Products
  const addProduct = async (
    setId: string,
    data: { name: string; description?: string; price?: number | null; imageUrl?: string }
  ) => {
    const response = await fetch(`${API_BASE_URL}/products/sets/${setId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to add product')
    const newProduct: SetProduct = await response.json()
    for (const type of catalog.value.types) {
      const set = type.sets.find(s => s.id === setId)
      if (set) {
        set.products.push(newProduct)
        break
      }
    }
    return newProduct
  }

  const updateProduct = async (itemId: string, updates: Partial<SetProduct>) => {
    const response = await fetch(`${API_BASE_URL}/products/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update product')
    const updated: SetProduct = await response.json()
    for (const type of catalog.value.types) {
      for (const set of type.sets) {
        const target = set.products.find(p => p.id === itemId)
        if (target) {
          Object.assign(target, updated)
          return updated
        }
      }
    }
    return updated
  }

  const deleteProduct = async (itemId: string) => {
    const response = await fetch(`${API_BASE_URL}/products/items/${itemId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete product')
    for (const type of catalog.value.types) {
      for (const set of type.sets) {
        set.products = set.products.filter(p => p.id !== itemId)
      }
    }
  }

  return {
    catalog,
    loading,
    error,
    fetchCatalog,
    addType,
    updateType,
    deleteType,
    addSet,
    updateSet,
    deleteSet,
    addProduct,
    updateProduct,
    deleteProduct,
  }
})
