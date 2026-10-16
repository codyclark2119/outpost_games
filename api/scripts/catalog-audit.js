#!/usr/bin/env node
// Turns a snapshot from scripts/catalog-snapshot.js into a cleanup report:
// duplicate listings (and which one of each has actually sold), stray
// listings and categories, and how the top-level categories split into
// trading card games vs. everything else. Offline and read-only: it never
// talks to Square.
//
// Usage:
//   node scripts/catalog-audit.js data/catalog-snapshot/snapshot-2026-10-16.json [outDir]
//
// Writes report.md, listings.csv, duplicates.csv and strays.csv to outDir
// (default: next to the snapshot).

import fs from 'node:fs'
import path from 'node:path'

const snapshotPath = process.argv[2]
if (!snapshotPath) {
  console.error('Usage: node scripts/catalog-audit.js <snapshot.json> [outDir]')
  process.exit(1)
}
const outDir = process.argv[3] || path.dirname(snapshotPath)
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))

// Top-level categories that are not trading card games. Matched on the
// trimmed, lower-cased name, by whole word, so "Snacks & Drinks" counts.
const NON_TCG =
  /\b(snacks?|food|drinks?|concessions?|candy|accessor(y|ies)|supplies|sleeves|tournaments?|entry|entries|events?|services?|misc(ellaneous)?|merch(andise)?|apparel|gift ?cards?|board ?games?|dice|binders?|play ?mats?|deck ?box(es)?)\b/i

// ---------- categories ----------
const categoriesById = new Map(snapshot.categories.map(c => [c.id, c]))
const catName = id => categoriesById.get(id)?.category_data?.name ?? null
const parentOf = id => categoriesById.get(id)?.category_data?.parent_category?.id || null
const topOf = id => {
  let current = id
  let top = null
  for (let guard = 0; current && guard < 10; guard++) {
    if (!categoriesById.has(current)) break
    top = current
    current = parentOf(current)
  }
  return top
}
const pathOf = id => {
  const parts = []
  let current = id
  for (let guard = 0; current && guard < 10; guard++) {
    if (!categoriesById.has(current)) break
    parts.unshift(catName(current))
    current = parentOf(current)
  }
  return parts.join(' > ')
}

// ---------- sales ----------
const salesByVariation = new Map()
const unmatchedSales = new Map()
for (const line of snapshot.orderLines) {
  const key = line.catalogObjectId
  const bucket = key ? salesByVariation : unmatchedSales
  const id =
    key ||
    `${line.name || 'Custom amount'}${line.variationName && line.variationName !== 'Regular' ? ` - ${line.variationName}` : ''}`
  const entry = bucket.get(id) || {
    units: 0,
    orders: 0,
    grossCents: 0,
    lastSold: null,
    name: line.name,
    variationName: line.variationName,
  }
  entry.units += line.quantity
  entry.orders += 1
  entry.grossCents += line.grossCents || 0
  if (!entry.lastSold || line.closedAt > entry.lastSold) entry.lastSold = line.closedAt
  bucket.set(id, entry)
}

// ---------- listings (one row per variation) ----------
const countByVariation = new Map()
for (const count of snapshot.counts) {
  countByVariation.set(
    count.catalog_object_id,
    (countByVariation.get(count.catalog_object_id) || 0) + Number(count.quantity || 0)
  )
}

const listings = []
const knownVariationIds = new Set()
for (const item of snapshot.items) {
  const data = item.item_data || {}
  const categoryIds = (data.categories || []).map(c => c.id)
  const reportingId = data.reporting_category?.id || null
  const leafId = reportingId || categoryIds[0] || null
  const topId = leafId ? topOf(leafId) : null
  const missingCategoryIds = [...categoryIds, reportingId].filter(
    id => id && !categoriesById.has(id)
  )
  for (const variation of data.variations || []) {
    knownVariationIds.add(variation.id)
    const v = variation.item_variation_data || {}
    const sales = salesByVariation.get(variation.id)
    listings.push({
      itemId: item.id,
      variationId: variation.id,
      itemName: (data.name || '').trim(),
      variationName: (v.name || '').trim(),
      variationCount: (data.variations || []).length,
      sku: (v.sku || '').trim(),
      gtin: (v.upc || '').trim(),
      priceCents: v.price_money?.amount ?? null,
      tracked: Boolean(v.track_inventory),
      onHand: countByVariation.has(variation.id) ? countByVariation.get(variation.id) : null,
      topCategory: topId ? (catName(topId) || '').trim() : '',
      categoryPath: leafId ? pathOf(leafId) : '',
      categoryIds,
      reportingId,
      missingCategoryIds,
      categoriesDrifted: Boolean(
        reportingId && categoryIds.length && !categoryIds.includes(reportingId)
      ),
      hasDescription: Boolean((data.description_plaintext || data.description || '').trim()),
      hasImage: Boolean((v.image_ids || data.image_ids || []).length),
      createdAt: item.created_at || null,
      updatedAt: item.updated_at || null,
      unitsSold: sales?.units || 0,
      ordersSold: sales?.orders || 0,
      salesCents: sales?.grossCents || 0,
      lastSold: sales?.lastSold || null,
    })
  }
}

const displayName = l =>
  l.variationName && l.variationName.toLowerCase() !== 'regular'
    ? `${l.itemName} - ${l.variationName}`
    : l.itemName
const detailScore = l =>
  (l.gtin ? 2 : 0) +
  (l.sku ? 1 : 0) +
  (l.hasImage ? 1 : 0) +
  (l.hasDescription ? 1 : 0) +
  (l.priceCents ? 1 : 0) +
  (l.topCategory ? 1 : 0)

const isTcg = name => Boolean(name) && !NON_TCG.test(name)

// ---------- duplicates ----------
const STOP = new Set([
  'the',
  'a',
  'of',
  'and',
  'mtg',
  'magic',
  'gathering',
  'tcg',
  'pokemon',
  'regular',
  'new',
  '&',
])
const normalize = text =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\bpacks?\b/g, 'pack')
    .replace(/\bboxes\b/g, 'box')
    .replace(/\bboosters?\b/g, 'booster')
    .replace(/\bbundles?\b/g, 'bundle')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const tokens = text =>
  normalize(text)
    .split(' ')
    .filter(t => t && !STOP.has(t))
const exactKey = l => tokens(displayName(l)).sort().join(' ')

const groups = []
const seenPairs = new Set()
const addGroup = (reason, members) => {
  const ids = [...new Set(members.map(m => m.variationId))].sort()
  if (ids.length < 2) return
  const key = ids.join('|')
  if (seenPairs.has(key)) return
  seenPairs.add(key)
  groups.push({ reason, members: ids.map(id => listings.find(l => l.variationId === id)) })
}

const bucketBy = (keyFn, reason) => {
  const buckets = new Map()
  for (const l of listings) {
    const key = keyFn(l)
    if (!key) continue
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(l)
  }
  for (const members of buckets.values()) {
    // Variations of one item sharing a name/code are a separate problem
    // (reported as strays), not duplicate listings.
    if (new Set(members.map(m => m.itemId)).size > 1) addGroup(reason, members)
  }
}

bucketBy(l => (l.gtin ? l.gtin.replace(/^0+/, '') : null), 'Same barcode (GTIN)')
bucketBy(l => (l.sku ? l.sku.toLowerCase() : null), 'Same SKU')
bucketBy(l => {
  const key = exactKey(l)
  return key.length >= 3 ? key : null
}, 'Same name')

// Near-identical names within the same top-level category: all tokens of the
// shorter name appear in the longer one and they share most tokens.
const byTop = new Map()
for (const l of listings) {
  if (!byTop.has(l.topCategory)) byTop.set(l.topCategory, [])
  byTop.get(l.topCategory).push(l)
}
const numbers = text => (normalize(text).match(/\b\d+\b/g) || []).join(',')
for (const members of byTop.values()) {
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]
      const b = members[j]
      if (a.itemId === b.itemId) continue
      // "Pack" vs "Box", "Collector" vs "Play", or different counts are
      // different products even when the names are otherwise close.
      if (numbers(displayName(a)) !== numbers(displayName(b))) continue
      const ta = new Set(tokens(displayName(a)))
      const tb = new Set(tokens(displayName(b)))
      if (ta.size < 2 || tb.size < 2) continue
      const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta]
      const shared = [...small].filter(t => large.has(t)).length
      const contained = shared === small.size
      const jaccard = shared / new Set([...ta, ...tb]).size
      const distinguishing = [
        'pack',
        'box',
        'bundle',
        'collector',
        'play',
        'draft',
        'set',
        'jumpstart',
        'commander',
        'prerelease',
        'deck',
        'case',
        'display',
        'sleeve',
        'foil',
      ]
      const differsOnKind = distinguishing.some(t => ta.has(t) !== tb.has(t))
      if (differsOnKind) continue
      if ((contained && jaccard >= 0.6) || jaccard >= 0.8) addGroup('Similar name', [a, b])
    }
  }
}

// Merge overlapping groups (A~B by barcode, B~C by name) into one.
const merged = []
for (const group of groups) {
  const ids = new Set(group.members.map(m => m.variationId))
  const existing = merged.find(g => g.members.some(m => ids.has(m.variationId)))
  if (existing) {
    for (const m of group.members)
      if (!existing.members.some(e => e.variationId === m.variationId)) existing.members.push(m)
    if (!existing.reasons.includes(group.reason)) existing.reasons.push(group.reason)
  } else {
    merged.push({ reasons: [group.reason], members: [...group.members] })
  }
}

const strongReasons = new Set(['Same barcode (GTIN)', 'Same SKU', 'Same name'])
for (const group of merged) {
  const sold = group.members.filter(m => m.unitsSold > 0).sort((a, b) => b.unitsSold - a.unitsSold)
  const mostDetailed = [...group.members].sort((a, b) => detailScore(b) - detailScore(a))[0]
  const keep = sold[0] || mostDetailed
  group.keep = keep
  group.confidence = group.reasons.some(r => strongReasons.has(r)) ? 'likely' : 'possible'
  const others = group.members.filter(m => m !== keep)
  const notes = []
  if (sold.length > 1)
    notes.push(
      `${sold.length} of these have sold, so the register has been using more than one of them`
    )
  if (keep !== mostDetailed && detailScore(mostDetailed) > detailScore(keep)) {
    notes.push(
      `the one that sells has fewer details than "${displayName(mostDetailed)}"; copy its photo/description/category over`
    )
    if (mostDetailed.gtin && mostDetailed.unitsSold === 0 && mostDetailed.gtin !== keep.gtin) {
      notes.push(
        `its barcode ${mostDetailed.gtin} has never rung up a sale, so check it against the box before reusing it`
      )
    }
  }
  const gtins = [...new Set(group.members.map(m => m.gtin).filter(Boolean))]
  if (gtins.length > 1) notes.push(`barcodes disagree: ${gtins.join(' vs ')}`)
  const prices = [...new Set(group.members.map(m => m.priceCents).filter(p => p != null))]
  if (prices.length > 1)
    notes.push(`prices disagree: ${prices.map(p => `$${(p / 100).toFixed(2)}`).join(' vs ')}`)
  const stocked = others.filter(m => m.onHand && m.onHand !== 0)
  if (stocked.length)
    notes.push(
      `move stock from ${stocked.map(m => `"${displayName(m)}" (${m.onHand})`).join(', ')} before removing it`
    )
  group.notes = notes
  group.proposal = `Keep "${displayName(keep)}"${keep.unitsSold ? ` (${keep.unitsSold} sold)` : ''}; fold in and archive ${others.map(m => `"${displayName(m)}"`).join(', ')}`
}
merged.sort((a, b) =>
  a.confidence === b.confidence
    ? b.members.length - a.members.length
    : a.confidence === 'likely'
      ? -1
      : 1
)

// ---------- strays ----------
const strays = []
const stray = (kind, l, detail = '') =>
  strays.push({
    kind,
    name: l ? displayName(l) : '',
    itemId: l?.itemId || '',
    variationId: l?.variationId || '',
    topCategory: l?.topCategory || '',
    detail,
  })

const now = Date.now()
const DAY = 86_400_000
for (const l of listings) {
  if (!l.categoryIds.length && !l.reportingId) stray('No category', l)
  if (l.missingCategoryIds.length)
    stray('Filed under a deleted category', l, l.missingCategoryIds.join(' '))
  if (l.categoriesDrifted)
    stray(
      'Category and reporting category disagree',
      l,
      `${pathOf(l.reportingId)} vs ${l.categoryIds.map(pathOf).join(', ')}`
    )
  if (l.priceCents == null) stray('No price', l)
  if (l.onHand != null && l.onHand < 0) stray('Negative stock', l, String(l.onHand))
  if (!l.tracked && isTcg(l.topCategory) && !/singles?/i.test(l.categoryPath + l.itemName))
    stray('TCG product not stock-tracked', l)
  if (/^bandai$/i.test(l.topCategory))
    stray('Still under the old Bandai umbrella', l, l.categoryPath)
  if (l.itemName !== l.itemName.replace(/\s+/g, ' ')) stray('Extra spaces in name', l)
  const created = l.createdAt ? Date.parse(l.createdAt) : now
  if (l.unitsSold === 0 && !(l.onHand > 0) && now - created > 180 * DAY)
    stray('Never sold, none on hand, over 6 months old', l)
}

// Variations of one item that share a name or barcode.
const byItem = new Map()
for (const l of listings) {
  if (!byItem.has(l.itemId)) byItem.set(l.itemId, [])
  byItem.get(l.itemId).push(l)
}
for (const variations of byItem.values()) {
  const names = new Map()
  for (const v of variations) {
    const key = v.variationName.toLowerCase()
    if (names.has(key)) stray('Two variations with the same name', v, `"${v.variationName}"`)
    names.set(key, v)
  }
}

// One barcode shared by different variations of the same item (e.g. every
// deck of a commander product carrying the first deck's GTIN): a scan can't
// tell them apart, so at most one of them is right.
for (const variations of byItem.values()) {
  const owners = new Map()
  for (const v of variations) {
    for (const code of [v.gtin, /^\d{8,14}$/.test(v.sku) ? v.sku : null]) {
      if (!code) continue
      const key = code.replace(/^0+/, '')
      if (!owners.has(key)) owners.set(key, new Set())
      owners.get(key).add(v)
    }
  }
  for (const [code, set] of owners) {
    if (set.size > 1)
      for (const v of set) stray('Barcode shared by variations of one item', v, code)
  }
}

// Barcode check digit: a GTIN that fails it was typed or scanned wrong.
const gtinValid = code => {
  const digits = code.split('').map(Number)
  const check = digits.pop()
  const sum = digits.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}
const OTHER_GAMES = { Magic: /\bpok|one piece|riftbound|lorcana/i, Pokemon: /magic|mtg|one piece/i }
for (const l of listings) {
  if (/^\d{8}$|^\d{12,14}$/.test(l.gtin) && !gtinValid(l.gtin))
    stray('Barcode fails its check digit', l, l.gtin)
  // Scanning the QR code on a package instead of its barcode stores a web
  // address, so the real barcode never matches at the register.
  if (/https?:|qr|\.(com|io|info|de)\//i.test(l.sku))
    stray('SKU is a web address (QR code scanned)', l, l.sku)
  if (/Ã|ã\u0303|A\u0303|â€|Â/.test(l.itemName)) stray('Garbled characters in name', l)
  if (OTHER_GAMES[l.topCategory]?.test(l.itemName))
    stray('Looks filed under the wrong game', l, l.categoryPath)
}

// Categories: duplicate names, empty ones, nested publishers.
const itemsPerCategory = new Map()
for (const item of snapshot.items) {
  for (const c of item.item_data?.categories || [])
    itemsPerCategory.set(c.id, (itemsPerCategory.get(c.id) || 0) + 1)
}
const hasChildren = new Set(snapshot.categories.map(c => parentOf(c.id)).filter(Boolean))
const categoryNames = new Map()
for (const c of snapshot.categories) {
  const p = pathOf(c.id)
  const key = p.toLowerCase().replace(/\s+/g, ' ').trim()
  if (categoryNames.has(key))
    strays.push({
      kind: 'Duplicate category name',
      name: p,
      itemId: '',
      variationId: c.id,
      topCategory: (catName(topOf(c.id)) || '').trim(),
      detail: `also ${categoryNames.get(key)}`,
    })
  else categoryNames.set(key, c.id)
  if (!itemsPerCategory.get(c.id) && !hasChildren.has(c.id))
    strays.push({
      kind: 'Empty category',
      name: p,
      itemId: '',
      variationId: c.id,
      topCategory: (catName(topOf(c.id)) || '').trim(),
      detail: '',
    })
  if ((c.category_data?.name || '') !== (c.category_data?.name || '').trim())
    strays.push({
      kind: 'Category name has stray spaces',
      name: JSON.stringify(c.category_data?.name),
      itemId: '',
      variationId: c.id,
      topCategory: '',
      detail: '',
    })
}

// Sales under listings that no longer exist (deleted items) or custom amounts.
const deletedSales = [...salesByVariation.entries()].filter(([id]) => !knownVariationIds.has(id))

// Deleted listings that sold, matched to the current listing that most likely
// replaced them. A replacement that has sold little or nothing since is the
// pattern where the listing staff actually rang up was removed and the new
// one isn't being scanned (wrong barcode, or sales going to custom amounts).
const replacements = []
for (const [id, sold] of deletedSales) {
  const label = `${sold.name || ''}${sold.variationName && sold.variationName !== 'Regular' ? ` ${sold.variationName}` : ''}`
  const ta = new Set(tokens(label))
  if (!ta.size) continue
  let best = null
  for (const l of listings) {
    if (numbers(label) !== numbers(displayName(l))) continue
    const tb = new Set(tokens(displayName(l)))
    const shared = [...ta].filter(t => tb.has(t)).length
    const score = shared / Math.min(ta.size, tb.size) + shared / new Set([...ta, ...tb]).size
    if (shared >= Math.min(2, ta.size) && (!best || score > best.score))
      best = { listing: l, score }
  }
  if (!best || best.score < 1.2) continue
  const l = best.listing
  const soldSince = snapshot.orderLines
    .filter(line => line.catalogObjectId === l.variationId && line.closedAt > sold.lastSold)
    .reduce((n, line) => n + line.quantity, 0)
  replacements.push({ id, label: label.trim(), sold, current: l, soldSince })
}
replacements.sort((a, b) => b.sold.units - a.sold.units)

// ---------- category overview ----------
const tops = new Map()
for (const l of listings) {
  const name = l.topCategory || '(no category)'
  const t = tops.get(name) || {
    name,
    listings: 0,
    onHand: 0,
    unitsSold: 0,
    salesCents: 0,
    subcategories: new Set(),
  }
  t.listings += 1
  t.onHand += Math.max(0, l.onHand || 0)
  t.unitsSold += l.unitsSold
  t.salesCents += l.salesCents
  if (l.categoryPath.includes(' > ')) t.subcategories.add(l.categoryPath.split(' > ')[1])
  tops.set(name, t)
}
const topRows = [...tops.values()].sort((a, b) => b.salesCents - a.salesCents)

// ---------- write ----------
const csv = rows => {
  const header = Object.keys(rows[0] || {})
  const cell = v => {
    const s = Array.isArray(v) ? v.join(' ') : v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header.join(','), ...rows.map(r => header.map(h => cell(r[h])).join(','))].join('\n')
}
const money = c => `$${((c || 0) / 100).toFixed(2)}`

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(
  path.join(outDir, 'listings.csv'),
  csv(
    listings.map(l => ({
      name: displayName(l),
      topCategory: l.topCategory,
      categoryPath: l.categoryPath,
      tcg: isTcg(l.topCategory) ? 'yes' : 'no',
      gtin: l.gtin,
      sku: l.sku,
      price: l.priceCents == null ? '' : money(l.priceCents),
      tracked: l.tracked,
      onHand: l.onHand,
      unitsSold: l.unitsSold,
      sales: money(l.salesCents),
      lastSold: l.lastSold?.slice(0, 10) || '',
      hasImage: l.hasImage,
      hasDescription: l.hasDescription,
      created: l.createdAt?.slice(0, 10) || '',
      itemId: l.itemId,
      variationId: l.variationId,
    }))
  )
)
fs.writeFileSync(
  path.join(outDir, 'duplicates.csv'),
  csv(
    merged.flatMap((g, index) =>
      g.members.map(m => ({
        group: index + 1,
        confidence: g.confidence,
        why: g.reasons.join('; '),
        action: m === g.keep ? 'KEEP' : 'fold in',
        name: displayName(m),
        topCategory: m.topCategory,
        gtin: m.gtin,
        sku: m.sku,
        price: m.priceCents == null ? '' : money(m.priceCents),
        onHand: m.onHand,
        unitsSold: m.unitsSold,
        lastSold: m.lastSold?.slice(0, 10) || '',
        detailScore: detailScore(m),
        notes: m === g.keep ? g.notes.join(' | ') : '',
        itemId: m.itemId,
        variationId: m.variationId,
      }))
    )
  )
)
fs.writeFileSync(path.join(outDir, 'strays.csv'), csv(strays))

const strayCounts = {}
for (const s of strays) strayCounts[s.kind] = (strayCounts[s.kind] || 0) + 1

const md = []
md.push(`# Square catalog cleanup report`, '')
md.push(
  `Snapshot of the ${snapshot.environment} Square account taken ${snapshot.takenAt.slice(0, 16).replace('T', ' ')} UTC. Sales history covers completed orders since ${snapshot.since}. Nothing in Square was changed.`,
  ''
)
md.push(
  `- ${snapshot.items.length} items, ${listings.length} variations, ${snapshot.categories.length} categories`
)
md.push(`- ${snapshot.orderLines.length} sold order lines`)
md.push(
  `- ${merged.filter(g => g.confidence === 'likely').length} likely duplicate groups, ${merged.filter(g => g.confidence === 'possible').length} possible ones`
)
md.push(`- ${strays.length} stray findings`, '')
md.push(`## Categories: TCG first, then everything else`, '')
md.push(
  `| Top-level category | Kind | Listings | On hand | Units sold | Sales |`,
  `|---|---|---:|---:|---:|---:|`
)
for (const t of [...topRows.filter(t => isTcg(t.name)), ...topRows.filter(t => !isTcg(t.name))]) {
  md.push(
    `| ${t.name} | ${isTcg(t.name) ? 'TCG' : 'Other'} | ${t.listings} | ${t.onHand} | ${t.unitsSold} | ${money(t.salesCents)} |`
  )
}
md.push('')
md.push(`## Duplicate listings`, '')
md.push(
  `"Keep" is the listing that has actually rung up at the register (most units sold), since that is the one staff scan. When none has sold, it is the most detailed one. Full detail per listing is in duplicates.csv.`,
  ''
)
merged.forEach((g, index) => {
  md.push(
    `### ${index + 1}. ${displayName(g.keep)} (${g.confidence}: ${g.reasons.join(', ').toLowerCase()})`,
    ''
  )
  md.push(
    `| Listing | Barcode | SKU | Price | On hand | Sold | Last sold | Details |`,
    `|---|---|---|---:|---:|---:|---|---:|`
  )
  for (const m of g.members)
    md.push(
      `| ${m === g.keep ? '**KEEP** ' : ''}${displayName(m)} | ${m.gtin || '—'} | ${m.sku || '—'} | ${m.priceCents == null ? '—' : money(m.priceCents)} | ${m.onHand ?? '—'} | ${m.unitsSold} | ${m.lastSold?.slice(0, 10) || '—'} | ${detailScore(m)}/7 |`
    )
  md.push(
    '',
    `Proposal: ${g.proposal}.${g.notes.length ? ` Notes: ${g.notes.join('; ')}.` : ''}`,
    ''
  )
})
md.push(`## Stray listings and categories`, '')
md.push(`| Finding | Count |`, `|---|---:|`)
for (const [kind, count] of Object.entries(strayCounts).sort((a, b) => b[1] - a[1]))
  md.push(`| ${kind} | ${count} |`)
md.push('', `Every row is in strays.csv.`, '')
if (replacements.length) {
  md.push(`## Deleted listings that sold, and what replaced them`, '')
  md.push(
    `Best guess at the current listing that replaced each one, by name. Little or nothing sold on the replacement since means the register is likely not finding it.`,
    ''
  )
  md.push(
    `| Deleted listing | Units sold | Last sold | Likely replacement | Its barcode | Sold since |`,
    `|---|---:|---|---|---|---:|`
  )
  for (const r of replacements)
    md.push(
      `| ${r.label} | ${r.sold.units} | ${r.sold.lastSold.slice(0, 10)} | ${displayName(r.current)} | ${r.current.gtin || r.current.sku || '—'} | ${r.soldSince} |`
    )
  md.push('')
}
if (deletedSales.length || unmatchedSales.size) {
  md.push(`## Sales not tied to a current listing`, '')
  md.push(
    `These rang up under a listing that has since been deleted, or as a custom amount, so their history won't follow any current product.`,
    ''
  )
  md.push(`| Sold as | Units | Sales | Last sold |`, `|---|---:|---:|---|`)
  const rows = [
    ...deletedSales.map(([, e]) => ({
      ...e,
      label: `${e.name || '?'}${e.variationName && e.variationName !== 'Regular' ? ` - ${e.variationName}` : ''} (deleted listing)`,
    })),
    ...[...unmatchedSales.entries()].map(([label, e]) => ({ ...e, label })),
  ]
  for (const e of rows.sort((a, b) => b.grossCents - a.grossCents).slice(0, 40))
    md.push(
      `| ${e.label} | ${e.units} | ${money(e.grossCents)} | ${e.lastSold?.slice(0, 10) || '—'} |`
    )
  md.push('')
}
fs.writeFileSync(path.join(outDir, 'report.md'), md.join('\n'))
console.log(`Wrote report.md, listings.csv, duplicates.csv, strays.csv to ${outDir}`)
console.log(`${merged.length} duplicate groups, ${strays.length} strays`)
