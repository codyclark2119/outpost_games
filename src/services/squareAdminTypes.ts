export interface SquareStockItem {
  id: string
  itemId: string
  displayName: string
  sku: string | null
  priceCents: number | null
  currency: string | null
  trackInventory: boolean
  sellable: boolean
  quantity: number | null
  state: string
  inStock: boolean
  source: string
  categoryId: string | null
  categoryName: string
  itemCreatedAt: string | null
}

export interface SquareInventoryReport {
  ok: boolean
  environment: string
  locationId: string | null
  itemCount: number
  items: SquareStockItem[]
}

export interface SalesBucket {
  date: string
  revenueCents: number
  orderCount: number
}

export interface TopItem {
  name: string
  categoryName: string
  unitsSold: number
  revenueCents: number
  costCents: number | null
  hasCostData: boolean
  profitCents: number | null
}

export interface TenderTotal {
  type: string
  amountCents: number
  count: number
}

export interface DayOfWeekTotal {
  day: string
  revenueCents: number
  orderCount: number
}

export interface HourOfDayTotal {
  hour: number
  revenueCents: number
  orderCount: number
}

export interface SalesReport {
  ok: boolean
  environment: string
  from: string
  to: string
  granularity: 'day' | 'week' | 'month'
  series: SalesBucket[]
  topItems: TopItem[]
  categoryBreakdown: TopItem[] // same shape as top items but rolled up by categoryName
  tenderTotals: TenderTotal[]
  dayOfWeek: DayOfWeekTotal[]
  hourOfDay: HourOfDayTotal[]
  totals: {
    revenueCents: number
    orderCount: number
    taxCents: number
    discountCents: number
    profitCents: number | null
    costDataCoverage: { itemsWithCost: number; itemsTotal: number }
  }
}

export interface RestockMapping {
  id: string
  boxVariationId: string
  boxName: string
  packsVariationId: string
  packsName: string
  packsPerBox: number
}

export interface RestockResult {
  boxName: string
  packsName: string
  previousBoxQty: number
  newBoxQty: number
  previousPacksQty: number
  newPacksQty: number
}
