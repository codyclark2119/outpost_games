import type { SquareStockItem } from '../services/squareAdminTypes'

// Mirrors barcodeVariants in api/squarePosClient.js (the API can't be imported
// here): UPC-A and EAN-13 are the same code with and without a leading 0, and
// a scanner may report either spelling.
export const barcodeVariants = (code: string) => {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return []
  const variants = new Set([normalized])
  if (/^0\d{12}$/.test(normalized)) variants.add(normalized.slice(1))
  if (/^\d{12}$/.test(normalized)) variants.add(`0${normalized}`)
  return [...variants]
}

// Every stock item whose SKU or GTIN matches the scanned code. Usually one;
// more than one means the same barcode is on several variations in Square.
export const findByBarcode = (items: SquareStockItem[], code: string) => {
  const variants = new Set(barcodeVariants(code))
  if (!variants.size) return []
  return items.filter(item =>
    [item.sku, item.upc].some(value => value && variants.has(value.trim().toUpperCase()))
  )
}
