import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadTS } from './loadTS.mjs'
const { splitCategoryGroups } = loadTS('../src/utils/adminCategoryGroups.ts')

// Real top-level category names from the shop's Square account (2026-10-16).
const groups = [
  { name: 'Accessories', size: 115 },
  { name: 'Uncategorized', size: 3 },
  { name: 'Snacks', size: 183 },
  { name: 'Warhammer ', size: 13 },
  { name: 'Pokemon', size: 85 },
  { name: 'Tournaments', size: 7 },
  { name: 'Union Arena', size: 6 },
  { name: 'Magic', size: 102 },
  { name: 'Riftbound', size: 18 },
  { name: 'One Piece', size: 11 },
]
const { games, snacksAndAccessories } = splitCategoryGroups(groups, g => g.size)

test('card games lead with the pinned order, then the biggest, Uncategorized last', () =>
  assert.deepEqual(
    games.map(g => g.name),
    ['Magic', 'Pokemon', 'One Piece', 'Riftbound', 'Warhammer ', 'Union Arena', 'Uncategorized']
  ))

test('snacks, accessories and tournament entries get their own section', () =>
  assert.deepEqual(
    snacksAndAccessories.map(g => g.name),
    ['Accessories', 'Snacks', 'Tournaments']
  ))

test('an accented or padded game name still sorts as pinned', () =>
  assert.deepEqual(
    splitCategoryGroups([{ name: 'Lorcana' }, { name: ' Pokémon ' }], () => 0).games.map(
      g => g.name
    ),
    [' Pokémon ', 'Lorcana']
  ))
