export interface StockRow {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
  categoryId: string | null
  categoryName: string
  trackInventory: boolean
  quantity: number | null
  inStock: boolean
}

export interface CategoryGroup {
  name: string
  rows: StockRow[]
}

export interface SquareCategory {
  id: string
  name: string | null
  path: string
}

export interface VariationForm {
  id: string
  name: string
  sku: string | null
  price: number
  cost: string
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
  correctedQuantity: number
  correctingCount: boolean
  inventoryError: string
  inventorySuccess: boolean
  deleteConfirming: boolean
  deleting: boolean
  deleteError: string
  imageUrl: string | null
  hasOwnImage: boolean
  uploadingImage: boolean
}
