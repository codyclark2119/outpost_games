#!/usr/bin/env node
// Cross-references a Wizards of the Coast retailer SKU sheet (the xlsx WotC
// ships ahead of each set's release — columns: Item Name, SKU, GTIN,
// Description, Item Type, Variation Name, Price) against the current Square
// catalog, and reports what's already there vs. what's new.
//
// Matching: primarily by GTIN — WotC's GTIN is the barcode actually printed
// on the product and is what Square's own `sku` field should hold for a
// physical retail item, so an exact GTIN match means "already in the
// catalog, correctly." A secondary normalized-name match catches items that
// exist under a different SKU convention (distributor SKU, hand-entered,
// etc.) and flags them for manual review rather than silently trusting it.
//
// Usage:
//   node scripts/cross-reference-wotc-sku.js <path-to.xlsx>                  # report only
//   node scripts/cross-reference-wotc-sku.js <path-to.xlsx> --create-drafts --category "<Name>"
//   node scripts/cross-reference-wotc-sku.js <path-to.xlsx> --update-existing --category "<Name>"
//   node scripts/cross-reference-wotc-sku.js <path-to.xlsx> --create-drafts --update-existing --category "<Name>"
//   node scripts/cross-reference-wotc-sku.js <path-to.xlsx> --create-drafts --sellable --category "<Name>"
//
// New items are created as hidden drafts by default, not live products:
// `sellable: false` (can't be rung up at the register), `track_inventory:
// true` (stock can still be received and counted ahead of street date). Pass
// `--sellable` for a set that's already available to sell in-store — new
// items are then created `sellable: true` instead, using the sheet's price.
//
// `--category "<Name>"` is required whenever `--create-drafts` and/or
// `--update-existing` is passed. The sheet has no set/category column, so the
// category to file items under is supplied explicitly rather than guessed
// from the filename — the category is looked up by name (case-insensitive)
// and created if it doesn't exist yet. `--create-drafts` files new items
// under it; `--update-existing` corrects any matched item that's filed
// somewhere else.
//
// `--update-existing` only touches exact-GTIN matches — a possible-name
// match (SKU/GTIN differs from what's on file) is lower confidence and is
// still only ever flagged for manual review, never auto-written.

import ExcelJS from 'exceljs'
import {
  listSquareCatalogItems,
  listSquareCategories,
  createSquareCategory,
  createSquareCatalogItem,
  getSquareCatalogItem,
  updateSquareCatalogItem,
  loadSquareEnvironment,
} from '../squarePosClient.js'

loadSquareEnvironment()

const CREATE_DRAFTS = process.argv.includes('--create-drafts')
const UPDATE_EXISTING = process.argv.includes('--update-existing')
const SELLABLE = process.argv.includes('--sellable')
const categoryFlagIndex = process.argv.indexOf('--category')
const CATEGORY_NAME = categoryFlagIndex !== -1 ? process.argv[categoryFlagIndex + 1] : null
const filePath = process.argv.slice(2).find(arg => arg.endsWith('.xlsx'))

if (!filePath) {
  console.error('Usage: node scripts/cross-reference-wotc-sku.js <path-to.xlsx> [--create-drafts] [--sellable] [--update-existing] [--category "<Name>"]')
  process.exit(1)
}

if ((CREATE_DRAFTS || UPDATE_EXISTING) && !CATEGORY_NAME) {
  console.error('--category "<Name>" is required when using --create-drafts or --update-existing')
  process.exit(1)
}

const REQUIRED_COLUMNS = ['Item Name', 'SKU', 'GTIN', 'Description', 'Item Type', 'Variation Name', 'Price']

const normalize = str =>
  (str || '')
    .toLowerCase()
    .replace(/[®™|:,.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

async function readWotcSheet(path) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.worksheets[0]

  const header = sheet.getRow(1).values.slice(1).map(v => String(v).trim())
  const missingColumns = REQUIRED_COLUMNS.filter(col => !header.includes(col))
  if (missingColumns.length) {
    throw new Error(`This doesn't look like a WotC SKU sheet — missing columns: ${missingColumns.join(', ')}`)
  }
  const columnIndex = Object.fromEntries(header.map((name, i) => [name, i + 1]))

  const itemsByName = new Map()
  let rowCount = 0

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const name = row.getCell(columnIndex['Item Name']).value
    if (!name) return
    rowCount += 1

    if (!itemsByName.has(name)) {
      itemsByName.set(name, {
        name: String(name).trim(),
        description: row.getCell(columnIndex['Description']).value || '',
        variations: [],
      })
    }

    const price = row.getCell(columnIndex['Price']).value
    itemsByName.get(name).variations.push({
      variationName: row.getCell(columnIndex['Variation Name']).value || 'Regular',
      gtin: row.getCell(columnIndex['GTIN']).value ? String(row.getCell(columnIndex['GTIN']).value) : null,
      wotcSku: row.getCell(columnIndex['SKU']).value || null,
      priceCents: price ? Math.round(Number(price) * 100) : null,
    })
  })

  return { items: [...itemsByName.values()], rowCount }
}

async function resolveCategoryId(name, env) {
  const categories = await listSquareCategories(env)
  const normalized = name.trim().toLowerCase()
  const existing = categories.find(category => (category.name || '').trim().toLowerCase() === normalized)
  if (existing) {
    console.log(`Using existing category "${existing.name}" (${existing.id})`)
    return existing.id
  }
  console.log(`Category "${name}" not found — creating it...`)
  const created = await createSquareCategory({ name }, env)
  console.log(`Created category "${created.name}" (${created.id})`)
  return created.id
}

async function main() {
  const { items: fileItems, rowCount } = await readWotcSheet(filePath)
  console.log(`Parsed ${fileItems.length} product(s) / ${rowCount} variation row(s) from ${filePath}`)

  console.log('Reading current Square catalog...')
  const catalogVariations = await listSquareCatalogItems(process.env)
  const bySku = new Map(catalogVariations.filter(v => v.sku).map(v => [v.sku, v]))
  const normalizedCatalog = catalogVariations.map(v => ({ ...v, normalizedName: normalize(v.name) }))

  const results = { exactGtinMatch: [], possibleNameMatch: [], new: [] }

  for (const item of fileItems) {
    for (const variation of item.variations) {
      const gtinMatch = variation.gtin && bySku.get(variation.gtin)
      if (gtinMatch) {
        results.exactGtinMatch.push({ item, variation, match: gtinMatch })
        continue
      }
      const normalizedItemName = normalize(item.name)
      const nameMatch = normalizedCatalog.find(
        v => v.normalizedName === normalizedItemName || v.normalizedName.includes(normalizedItemName)
      )
      if (nameMatch) {
        results.possibleNameMatch.push({ item, variation, match: nameMatch })
      } else {
        results.new.push({ item, variation })
      }
    }
  }

  console.log(`\n✅ Already in catalog (GTIN match): ${results.exactGtinMatch.length}`)
  for (const r of results.exactGtinMatch) {
    console.log(`   "${r.item.name}" / ${r.variation.variationName} → "${r.match.name}" (sku ${r.match.sku})`)
  }

  console.log(`\n⚠️  Possible match by name, but SKU/GTIN differs — review manually: ${results.possibleNameMatch.length}`)
  for (const r of results.possibleNameMatch) {
    console.log(`   "${r.item.name}" (file GTIN ${r.variation.gtin}) ~ "${r.match.name}" (catalog sku ${r.match.sku})`)
  }

  console.log(`\n🆕 Not in catalog at all: ${results.new.length}`)
  for (const r of results.new) {
    console.log(`   ${r.item.name} — ${r.variation.variationName} (GTIN ${r.variation.gtin}, WotC SKU ${r.variation.wotcSku})`)
  }

  if (!CREATE_DRAFTS && !UPDATE_EXISTING) {
    console.log('\nReport only — rerun with --create-drafts and/or --update-existing (plus --category) to write changes.')
    return
  }

  const categoryId = await resolveCategoryId(CATEGORY_NAME, process.env)

  if (UPDATE_EXISTING) {
    // One item can have multiple matched variations (e.g. a two-pack) — only
    // fetch/update the underlying Square item once per file item, not once per row.
    const itemIdByFileName = new Map()
    for (const r of results.exactGtinMatch) {
      if (!itemIdByFileName.has(r.item.name)) itemIdByFileName.set(r.item.name, r.match.itemId)
    }

    console.log(`\nChecking ${itemIdByFileName.size} matched item(s) for corrections...`)
    let updatedCount = 0
    let alreadyCorrectCount = 0

    for (const [fileName, itemId] of itemIdByFileName) {
      const fileItem = fileItems.find(item => item.name === fileName)
      const current = await getSquareCatalogItem(itemId, process.env)
      const currentCategoryIds = (current.categories || []).map(category => category.id)

      const needsNameUpdate = current.name !== fileItem.name
      const needsDescriptionUpdate = (current.description || '') !== (fileItem.description || '')
      const needsCategoryUpdate = !currentCategoryIds.includes(categoryId)

      if (!needsNameUpdate && !needsDescriptionUpdate && !needsCategoryUpdate) {
        console.log(`   "${current.name}" — already correct, no write needed`)
        alreadyCorrectCount += 1
        continue
      }

      await updateSquareCatalogItem(itemId, {
        name: fileItem.name,
        description: fileItem.description,
        categoryIds: [categoryId],
      }, process.env)
      console.log(`   updated "${current.name}"${needsNameUpdate ? ` → "${fileItem.name}"` : ''}`)
      updatedCount += 1
    }

    console.log(`\nUpdated ${updatedCount} existing item(s), ${alreadyCorrectCount} already correct.`)
  }

  if (CREATE_DRAFTS) {
    // Only create items with zero matches of any kind — an item with some
    // variations already matched is a case for manual review, not an auto-create.
    const itemNamesWithAnyMatch = new Set(
      [...results.exactGtinMatch, ...results.possibleNameMatch].map(r => r.item.name)
    )
    const fullyNewItems = fileItems.filter(item => !itemNamesWithAnyMatch.has(item.name))

    console.log(`\nCreating ${fullyNewItems.length} new ${SELLABLE ? 'sellable' : 'draft'} item(s) in Square...`)
    for (const item of fullyNewItems) {
      const created = await createSquareCatalogItem({
        name: item.name,
        description: item.description,
        categoryIds: [categoryId],
        variations: item.variations.map(v => ({
          name: v.variationName,
          sku: v.gtin || undefined,
          priceCents: v.priceCents,
          trackInventory: true,
          sellable: SELLABLE,
          stockable: true,
        })),
      }, process.env)
      console.log(`   created "${item.name}" → ${created.id}`)
    }
  }
}

main().catch(error => {
  console.error('Cross-reference failed:', error.message)
  process.exit(1)
})
