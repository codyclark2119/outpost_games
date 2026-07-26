import {
  createSquarePosClient,
  resolveSquareCredentials,
  loadSquareEnvironment,
  listSquareCatalogItems,
  resolveTopLevelCategoryMap,
} from './squarePosClient.js'

const ORDERS_PAGE_SAFETY_CAP = 200
const STORE_TIMEZONE = 'America/Chicago'
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const clientFromEnv = (env = process.env) => {
  loadSquareEnvironment()
  return createSquarePosClient(resolveSquareCredentials(env))
}

// Bucket key for a given ISO timestamp: 'day' -> 'YYYY-MM-DD', 'week' -> the
// Monday of that week as 'YYYY-MM-DD', 'month' -> 'YYYY-MM'. Bucketing is done
// in UTC — Square timestamps are UTC and this is for trend-shape, not
// tax-day accounting.
const bucketKey = (isoTimestamp, granularity) => {
  const date = new Date(isoTimestamp)
  if (granularity === 'month') {
    return isoTimestamp.slice(0, 7)
  }
  if (granularity === 'week') {
    const day = date.getUTCDay() // 0 (Sun) - 6 (Sat)
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() - diffToMonday)
    return monday.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

// Store-local weekday/hour — orders are timestamped in UTC, but "which day or
// hour sells best" is only meaningful in the shop's own timezone (open
// Thu-Sun, 5-10 PM Central), not UTC. Same ICU-midnight-quirk guard as
// squarePublicCatalogCache.js's isStoreOpenNow().
const localPartsOf = isoTimestamp => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    weekday: 'long',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(isoTimestamp))
  const weekday = parts.find(part => part.type === 'weekday')?.value
  const rawHour = Number(parts.find(part => part.type === 'hour')?.value)
  return { weekday, hour: rawHour === 24 ? 0 : rawHour }
}

const lineItemKey = lineItem =>
  lineItem.variation_name && lineItem.variation_name !== 'Regular'
    ? `${lineItem.name} - ${lineItem.variation_name}`
    : lineItem.name || 'Unknown item'

const fetchCompletedOrders = async (client, from, to) => {
  const orders = []
  let cursor
  let page = 0

  do {
    const body = {
      location_ids: [client.locationId],
      query: {
        filter: {
          state_filter: { states: ['COMPLETED'] },
          date_time_filter: { closed_at: { start_at: from, end_at: to } },
        },
        sort: { sort_field: 'CLOSED_AT', sort_order: 'ASC' },
      },
      limit: 200,
      ...(cursor ? { cursor } : {}),
    }
    const payload = await client.request('/v2/orders/search', { method: 'POST', body })
    orders.push(...(payload.orders || []))
    cursor = payload.cursor
    page += 1
  } while (cursor && page < ORDERS_PAGE_SAFETY_CAP)

  return orders
}

// Aggregates completed Square orders in [from, to) into every angle the admin
// sales dashboard shows: a revenue/order-count trend series, a top-products
// breakdown (with category + profit where cost data exists), category-level
// rollups, payment-method (tender) totals, and store-local day-of-week /
// hour-of-day breakdowns. `revenueCents` per bucket/order is `total_money`
// (what the customer actually paid, tax included) — the simplest,
// least-surprising "sales" figure for a trend chart. Per-item figures use
// `gross_sales_money` (pre-tax, pre-discount) since tax isn't allocated per
// line item in a way that's meaningful to attribute.
export const getSquareSalesReport = async ({ from, to, granularity = 'day' }, env = process.env) => {
  const client = clientFromEnv(env)
  if (!client.locationId) {
    throw new Error('A Square location id is required to read sales')
  }

  const [orders, variations, { topOf }] = await Promise.all([
    fetchCompletedOrders(client, from, to),
    listSquareCatalogItems(env),
    resolveTopLevelCategoryMap(env),
  ])

  // catalog_object_id on an order line item is the variation's id (confirmed
  // live against this account's real order history) — the same id
  // listSquareCatalogItems keys its variations by, so both category and unit
  // cost can be joined straight onto each line item with no extra API calls.
  const categoryByVariationId = new Map()
  const costCentsByVariationId = new Map()
  for (const variation of variations) {
    const topCategory = variation.categoryIds?.[0] ? topOf(variation.categoryIds[0]) : null
    categoryByVariationId.set(variation.id, topCategory?.name || 'Uncategorized')
    costCentsByVariationId.set(variation.id, variation.costCents)
  }

  const seriesByBucket = new Map()
  const itemTotals = new Map()
  const categoryTotals = new Map()
  const tenderTotals = new Map()
  const dayOfWeekTotals = new Map(
    DAY_NAMES.map(day => [day, { day, revenueCents: 0, orderCount: 0 }])
  )
  const hourOfDayTotals = new Map(
    Array.from({ length: 24 }, (_, hour) => [hour, { hour, revenueCents: 0, orderCount: 0 }])
  )

  let totalTaxCents = 0
  let totalDiscountCents = 0

  for (const order of orders) {
    const closedAt = order.closed_at
    const revenueCents = order.total_money?.amount || 0

    const key = bucketKey(closedAt, granularity)
    const bucket = seriesByBucket.get(key) || { date: key, revenueCents: 0, orderCount: 0 }
    bucket.revenueCents += revenueCents
    bucket.orderCount += 1
    seriesByBucket.set(key, bucket)

    const { weekday, hour } = localPartsOf(closedAt)
    const dowEntry = dayOfWeekTotals.get(weekday)
    if (dowEntry) {
      dowEntry.revenueCents += revenueCents
      dowEntry.orderCount += 1
    }
    const hourEntry = hourOfDayTotals.get(hour)
    if (hourEntry) {
      hourEntry.revenueCents += revenueCents
      hourEntry.orderCount += 1
    }

    totalTaxCents += order.total_tax_money?.amount || 0
    totalDiscountCents += order.total_discount_money?.amount || 0

    // Orders can legitimately have zero tenders (e.g. fully comped) — those
    // just don't contribute to the payment-method breakdown.
    for (const tender of order.tenders || []) {
      const type = tender.type || 'OTHER'
      const entry = tenderTotals.get(type) || { type, amountCents: 0, count: 0 }
      entry.amountCents += tender.amount_money?.amount || 0
      entry.count += 1
      tenderTotals.set(type, entry)
    }

    for (const lineItem of order.line_items || []) {
      const name = lineItemKey(lineItem)
      const categoryName = categoryByVariationId.get(lineItem.catalog_object_id) || 'Uncategorized'
      const costCentsPerUnit = costCentsByVariationId.get(lineItem.catalog_object_id) ?? null
      const units = Number(lineItem.quantity) || 0
      const itemRevenueCents = lineItem.gross_sales_money?.amount || 0
      const itemCostCents = costCentsPerUnit != null ? costCentsPerUnit * units : null

      const itemEntry = itemTotals.get(name) || {
        name,
        categoryName,
        unitsSold: 0,
        revenueCents: 0,
        costCents: null,
        hasCostData: false,
      }
      itemEntry.unitsSold += units
      itemEntry.revenueCents += itemRevenueCents
      if (itemCostCents != null) {
        itemEntry.costCents = (itemEntry.costCents || 0) + itemCostCents
        itemEntry.hasCostData = true
      }
      itemTotals.set(name, itemEntry)

      const catEntry = categoryTotals.get(categoryName) || {
        categoryName,
        unitsSold: 0,
        revenueCents: 0,
        costCents: null,
        hasCostData: false,
      }
      catEntry.unitsSold += units
      catEntry.revenueCents += itemRevenueCents
      if (itemCostCents != null) {
        catEntry.costCents = (catEntry.costCents || 0) + itemCostCents
        catEntry.hasCostData = true
      }
      categoryTotals.set(categoryName, catEntry)
    }
  }

  // profitCents only reflects items with cost data entered — left null
  // (rather than assumed zero-cost) wherever nothing's been entered yet, so
  // the dashboard can honestly show "no cost data" instead of a misleading
  // 100% margin.
  const withProfit = entry => ({
    ...entry,
    profitCents: entry.hasCostData ? entry.revenueCents - entry.costCents : null,
  })

  const series = [...seriesByBucket.values()].sort((a, b) => a.date.localeCompare(b.date))
  const topItems = [...itemTotals.values()].map(withProfit).sort((a, b) => b.unitsSold - a.unitsSold)
  const categoryBreakdown = [...categoryTotals.values()]
    .map(withProfit)
    .sort((a, b) => b.revenueCents - a.revenueCents)

  const totals = series.reduce(
    (acc, bucket) => ({
      revenueCents: acc.revenueCents + bucket.revenueCents,
      orderCount: acc.orderCount + bucket.orderCount,
    }),
    { revenueCents: 0, orderCount: 0 }
  )
  const itemsWithCost = topItems.filter(item => item.hasCostData)
  const profitCents = itemsWithCost.length
    ? itemsWithCost.reduce((sum, item) => sum + item.profitCents, 0)
    : null

  return {
    ok: true,
    environment: client.environment,
    from,
    to,
    granularity,
    series,
    topItems,
    categoryBreakdown,
    tenderTotals: [...tenderTotals.values()].sort((a, b) => b.amountCents - a.amountCents),
    dayOfWeek: [...dayOfWeekTotals.values()],
    hourOfDay: [...hourOfDayTotals.values()],
    totals: {
      ...totals,
      taxCents: totalTaxCents,
      discountCents: totalDiscountCents,
      profitCents,
      costDataCoverage: { itemsWithCost: itemsWithCost.length, itemsTotal: topItems.length },
    },
  }
}
