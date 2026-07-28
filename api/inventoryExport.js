// ─── Monthly inventory export ────────────────────────────────────────────────
// Builds an .xlsx snapshot of the Square inventory report (non-snack items,
// grouped by stock status → category → quantity) and emails it to the shop.
// Scheduling mirrors squarespaceCache.js's Redis-with-memory-fallback
// convention: the shared Redis client + a live "connected" flag are injected
// via initInventoryExport() so this reuses server.js's single connection.

import ExcelJS from 'exceljs'

import { getSquareInventoryReport } from './squarePosClient.js'
import { sendMail } from './mailClient.js'

const LAST_RUN_KEY = 'outpost:inventory-export:lastRun'
const STORE_TIMEZONE = 'America/Chicago'
export const EXCLUDED_EXPORT_CATEGORIES = ['Snacks']
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

let redisClient = null
let isRedisConnected = () => false
let memoryLastRun = null // 'YYYY-MM' the export last actually sent for

export const initInventoryExport = ({ redisClient: client, isRedisConnected: connectedFn }) => {
  redisClient = client
  if (typeof connectedFn === 'function') isRedisConnected = connectedFn
}

// Store-local date parts — "the 1st of the month" only means something in the
// shop's own timezone, not UTC. Same ICU-midnight-quirk guard used elsewhere
// in this codebase (squareOrdersClient.js's localPartsOf()).
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

const readLastRun = async () => {
  if (!isRedisConnected() || !redisClient) return memoryLastRun
  try {
    return (await redisClient.get(LAST_RUN_KEY)) || memoryLastRun
  } catch {
    return memoryLastRun
  }
}

const writeLastRun = async monthKey => {
  memoryLastRun = monthKey
  if (!isRedisConnected() || !redisClient) return
  try {
    await redisClient.set(LAST_RUN_KEY, monthKey)
  } catch {
    // In-memory value above still records the run for this process's lifetime.
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const runMonthlyInventoryExport = async (env = process.env) => {
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

  await writeLastRun(monthKey)
  return { monthKey, itemCount }
}

export const startInventoryExportScheduler = (env = process.env) => {
  const tick = async () => {
    const { year, month, day } = localDatePartsOf(new Date())
    if (day !== 1) return
    const monthKey = `${year}-${month}`
    const lastRun = await readLastRun()
    if (lastRun === monthKey) return

    try {
      await runMonthlyInventoryExport(env)
      console.log(`✅ Monthly inventory export sent for ${monthKey}`)
    } catch (error) {
      console.error('❌ Monthly inventory export failed:', error.message)
    }
  }

  tick()
  setInterval(tick, CHECK_INTERVAL_MS)
}
