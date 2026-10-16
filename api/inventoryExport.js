import storeConfig from './storeConfig.json' with { type: 'json' }
import { assertPersistence, createValue, requiresPersistence } from './services/persistence.js'
// ─── Monthly inventory export ────────────────────────────────────────────────
// Builds an .xlsx snapshot of the Square inventory report (non-snack items,
// grouped by stock status → category → quantity) and emails it to the shop.
// The month it last sent for is kept in the shared Redis store
// (services/redis.js, injected via initInventoryExport()) so a restart on the
// 1st never sends the same report twice.

import ExcelJS from 'exceljs'

import { getSquareInventoryReport } from './square/index.js'
import { sendMail } from './mailClient.js'

const LAST_RUN_KEY = 'outpost:inventory-export:lastRun'
const STORE_TIMEZONE = storeConfig.timeZone
export const EXCLUDED_EXPORT_CATEGORIES = ['Snacks']
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

let store = { redisClient: null, isRedisConnected: () => false, persistent: requiresPersistence() }
let lastRun = createValue(store, LAST_RUN_KEY) // 'YYYY-MM' the export last actually sent for

export const initInventoryExport = sharedStore => {
  store = { persistent: requiresPersistence(), ...sharedStore }
  lastRun = createValue(store, LAST_RUN_KEY)
}

// Store-local date parts — "the 1st of the month" only means something in the
// shop's own timezone, not UTC. Same ICU-midnight-quirk guard used elsewhere
// in this codebase (square/orders.js's localPartsOf()).
const localDatePartsOf = date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value
  return { year: get('year'), month: get('month'), day: Number(get('day')) }
}

export const daysInCatalog = item => {
  if (!item.itemCreatedAt) return ''
  const createdAt = new Date(item.itemCreatedAt).getTime()
  if (Number.isNaN(createdAt)) return ''
  return Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000))
}

export const statusLabel = item => {
  if (!item.trackInventory) return 'Not Tracked'
  return item.inStock ? 'In Stock' : 'Out of Stock'
}

// In-stock first, then by category name, then lowest quantity first within
// each category — surfaces aging/low stock that needs to sell before new
// stock arrives, per the same priority as the admin CSV export.
export const sortForExport = items =>
  [...items].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    const categoryCompare = (a.categoryName || 'Uncategorized').localeCompare(
      b.categoryName || 'Uncategorized'
    )
    if (categoryCompare !== 0) return categoryCompare
    return (a.quantity ?? Infinity) - (b.quantity ?? Infinity)
  })

export const buildInventoryWorkbook = async (env = process.env) => {
  const report = await getSquareInventoryReport(env)
  const items = sortForExport(
    report.items.filter(item => !EXCLUDED_EXPORT_CATEGORIES.includes(item.categoryName))
  )

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Inventory')

  sheet.columns = [
    { header: 'Item', key: 'item', width: 40 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Price', key: 'price', width: 10 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Sellable', key: 'sellable', width: 10 },
    { header: 'Variation ID', key: 'variationId', width: 28 },
    { header: 'Added to Catalog', key: 'addedToCatalog', width: 16 },
    { header: 'Days in Catalog', key: 'daysInCatalog', width: 14 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const item of items) {
    sheet.addRow({
      item: item.displayName,
      sku: item.sku || '',
      category: item.categoryName || 'Uncategorized',
      price: item.priceCents != null ? item.priceCents / 100 : null,
      quantity: item.quantity ?? '',
      status: statusLabel(item),
      sellable: item.sellable ? 'Yes' : 'No',
      variationId: item.id,
      addedToCatalog: item.itemCreatedAt ? item.itemCreatedAt.slice(0, 10) : '',
      daysInCatalog: daysInCatalog(item),
    })
  }

  return { buffer: await workbook.xlsx.writeBuffer(), itemCount: items.length }
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const runMonthlyInventoryExport = async (env = process.env) => {
  assertPersistence(store)
  const { year, month } = localDatePartsOf(new Date())
  const monthKey = `${year}-${month}`
  const monthLabel = `${MONTH_NAMES[Number(month) - 1]} ${year}`

  const { buffer, itemCount } = await buildInventoryWorkbook(env)

  await sendMail(
    {
      subject: `Outpost Games — Inventory Report — ${monthLabel}`,
      text: `Attached: the ${monthLabel} inventory export (${itemCount} items, snacks excluded), sorted by stock status, category, and quantity.`,
      attachments: [
        {
          filename: `outpost-inventory-${monthKey}.xlsx`,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    },
    env
  )

  await lastRun.set(monthKey)
  return { monthKey, itemCount }
}

export const startInventoryExportScheduler = (env = process.env) => {
  const tick = async () => {
    const { year, month, day } = localDatePartsOf(new Date())
    if (day !== 1) return
    const monthKey = `${year}-${month}`
    // Inside the try: without Redis in production the read throws, and an
    // unhandled rejection here would take the whole API down.
    try {
      if ((await lastRun.get()) === monthKey) return
      await runMonthlyInventoryExport(env)
      console.log(`✅ Monthly inventory export sent for ${monthKey}`)
    } catch (error) {
      console.error('❌ Monthly inventory export failed:', error.message)
    }
  }

  tick()
  setInterval(tick, CHECK_INTERVAL_MS)
}
