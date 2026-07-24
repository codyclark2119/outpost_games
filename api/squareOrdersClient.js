import { createSquarePosClient, resolveSquareCredentials, loadSquareEnvironment } from './squarePosClient.js'

const ORDERS_PAGE_SAFETY_CAP = 200

const clientFromEnv = (env = process.env) => {
  loadSquareEnvironment()
  return createSquarePosClient(resolveSquareCredentials(env))
}

// Bucket key for a given ISO timestamp: 'day' -> 'YYYY-MM-DD', 'week' -> the
// Monday of that week as 'YYYY-MM-DD'. Bucketing is done in UTC — Square
// timestamps are UTC and this is for trend-shape, not tax-day accounting.
const bucketKey = (isoTimestamp, granularity) => {
  const date = new Date(isoTimestamp)
  if (granularity === 'week') {
    const day = date.getUTCDay() // 0 (Sun) - 6 (Sat)
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(date)
    monday.setUTCDate(date.getUTCDate() - diffToMonday)
    return monday.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

const lineItemKey = lineItem =>
  lineItem.variation_name && lineItem.variation_name !== 'Regular'
    ? `${lineItem.name} - ${lineItem.variation_name}`
    : lineItem.name || 'Unknown item'

// Aggregates completed Square orders in [from, to) into a daily/weekly
// revenue series plus a top-products breakdown. `revenueCents` per bucket is
// each order's `total_money` (what the customer actually paid, tax included)
// — the simplest, least-surprising "sales" figure for a trend chart.
// Per-item figures use `gross_sales_money` (pre-tax, pre-discount) since tax
// isn't allocated per line item in a way that's meaningful to attribute.
export const getSquareSalesReport = async ({ from, to, granularity = 'day' }, env = process.env) => {
  const client = clientFromEnv(env)
  if (!client.locationId) {
    throw new Error('A Square location id is required to read sales')
  }

  const orders = []
  let cursor
  let page = 0

  do {
    const body = {
      location_ids: [client.locationId],
      query: {
        filter: {
          state_filter: { states: ['COMPLETED'] },
          date_time_filter: {
            closed_at: { start_at: from, end_at: to },
          },
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

  const seriesByBucket = new Map()
  const itemTotals = new Map()

  for (const order of orders) {
    const key = bucketKey(order.closed_at, granularity)
    const bucket = seriesByBucket.get(key) || { date: key, revenueCents: 0, orderCount: 0 }
    bucket.revenueCents += order.total_money?.amount || 0
    bucket.orderCount += 1
    seriesByBucket.set(key, bucket)

    for (const lineItem of order.line_items || []) {
      const name = lineItemKey(lineItem)
      const entry = itemTotals.get(name) || { name, unitsSold: 0, revenueCents: 0 }
      entry.unitsSold += Number(lineItem.quantity) || 0
      entry.revenueCents += lineItem.gross_sales_money?.amount || 0
      itemTotals.set(name, entry)
    }
  }

  const series = [...seriesByBucket.values()].sort((a, b) => a.date.localeCompare(b.date))
  const topItems = [...itemTotals.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10)
  const totals = series.reduce(
    (acc, bucket) => ({ revenueCents: acc.revenueCents + bucket.revenueCents, orderCount: acc.orderCount + bucket.orderCount }),
    { revenueCents: 0, orderCount: 0 }
  )

  return {
    ok: true,
    environment: client.environment,
    from,
    to,
    granularity,
    series,
    topItems,
    totals,
  }
}
