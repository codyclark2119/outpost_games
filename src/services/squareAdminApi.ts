import type {
  SquareInventoryReport,
  SalesReport,
  RestockMapping,
  RestockResult,
} from './squareAdminTypes'
import { apiFetch } from './api'
import type { SquareCategory } from '../components/admin/catalog/types'
export interface CatalogVariation {
  id: string
  name: string | null
  sku: string | null
  priceCents: number | null
  costCents: number | null
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
  imageUrl?: string | null
  hasOwnImage?: boolean
}
export interface CatalogItem {
  name: string
  description: string
  categories: { id: string }[]
  hiddenFromWeb: boolean
  releasedAt: string | null
  itemCreatedAt: string | null
  imageUrl: string | null
  variations: CatalogVariation[]
}
interface MutationResult {
  ok: boolean
  updatedCount?: number
  deletedIds?: string[]
}
interface NewVariation {
  name: string
  sku?: string
  priceCents: number | null
  trackInventory: boolean
  sellable: boolean
}
interface ProductUpdate {
  name: string
  description: string
  categoryIds: string[]
  hiddenFromWeb: boolean
  releasedAt: string | null
  variations: {
    id: string
    name: string
    priceCents: number
    costCents: number | null
    trackInventory: boolean
    sellable: boolean
  }[]
}
export interface BulkUpdate {
  itemIds: string[]
  categoryId?: string | null
  hiddenFromWeb?: boolean
  sellable?: boolean
  releasedAt?: string | null
}
export type BulkActionPath =
  | '/products/batch-delete'
  | '/products/batch-category'
  | '/products/batch-visibility'
  | '/products/batch-released-at'
export const squareAdminApi = {
  getSales: (
    query: { from: string; to: string; granularity: 'day' | 'week' | 'month' },
    signal?: AbortSignal
  ) => apiFetch<SalesReport>(`/square/sales?${new URLSearchParams(query)}`, { signal }),
  updateInventoryBatch: (changes: { variationId: string; quantity: number }[]) =>
    apiFetch<{ updatedCount: number }>('/square/inventory/batch', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    }),
  getRestockMappings: () => apiFetch<{ mappings: RestockMapping[] }>('/square/restock-mappings'),
  createRestockMapping: (body: Omit<RestockMapping, 'id'>) =>
    apiFetch<{ mapping: RestockMapping }>('/square/restock-mappings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteRestockMapping: (id: string) =>
    apiFetch<MutationResult>(`/square/restock-mappings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  applyRestock: (id: string, boxesOpened: number) =>
    apiFetch<Omit<RestockResult, 'boxName' | 'packsName'>>(
      `/square/restock-mappings/${encodeURIComponent(id)}/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ boxesOpened }),
      }
    ),

  getCatalog: (signal?: AbortSignal) =>
    apiFetch<SquareInventoryReport>(`/square/inventory-report`, { signal }),
  getCategories: (signal?: AbortSignal) =>
    apiFetch<{ categories: SquareCategory[] }>(`/square/categories`, { signal }),
  bulkUpdate: (path: BulkActionPath, body: BulkUpdate) =>
    apiFetch<MutationResult>(`/square${path}`, { method: 'POST', body: JSON.stringify(body) }),
  renameCategory: (id: string, body: { name: string }) =>
    apiFetch<MutationResult>(`/square/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  reparentCategory: (id: string, body: { parentCategoryId: string | null }) =>
    apiFetch<MutationResult>(`/square/categories/${encodeURIComponent(id)}/parent`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  mergeCategory: (id: string, body: { toCategoryId: string }) =>
    apiFetch<MutationResult>(`/square/categories/${encodeURIComponent(id)}/merge`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: string) =>
    apiFetch<MutationResult>(`/square/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getProduct: (id: string, signal?: AbortSignal) =>
    apiFetch<{ item: CatalogItem }>(`/square/products/${encodeURIComponent(id)}`, { signal }),
  updateProduct: (id: string, body: ProductUpdate) =>
    apiFetch<{ item: CatalogItem }>(`/square/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  createCategory: (body: { name: string; parentCategoryId?: string }) =>
    apiFetch<{ category: SquareCategory }>(`/square/categories`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadProductImage: (id: string, body: FormData) =>
    apiFetch<{ imageUrl: string }>(`/square/products/${encodeURIComponent(id)}/image`, {
      method: 'POST',
      body,
    }),
  uploadVariationImage: (id: string, variationId: string, body: FormData) =>
    apiFetch<{ imageUrl: string }>(
      `/square/products/${encodeURIComponent(id)}/variations/${encodeURIComponent(variationId)}/image`,
      { method: 'POST', body }
    ),
  addVariation: (id: string, body: NewVariation) =>
    apiFetch<{ item: CatalogItem }>(`/square/products/${encodeURIComponent(id)}/variations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateInventory: (id: string, body: { variationId: string; quantity: number }) =>
    apiFetch<MutationResult>(`/square/products/${encodeURIComponent(id)}/inventory`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteVariation: (id: string, variationId: string) =>
    apiFetch<MutationResult>(
      `/square/products/${encodeURIComponent(id)}/variations/${encodeURIComponent(variationId)}`,
      { method: 'DELETE' }
    ),
  deleteProduct: (id: string) =>
    apiFetch<MutationResult>(`/square/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
