// How the admin stock pages order and split their top-level category groups:
// card games first (the shop's main business, and all that the online shop
// lists), then snacks, accessories and tournament entries in their own
// section. Those are rung up in store and rarely edited here beyond zeroing
// counts after a convention.

const SNACKS_AND_ACCESSORIES =
  /\b(snacks?|food|drinks?|concessions?|candy|accessor(y|ies)|supplies|tournaments?)\b/i

// Same lead order as the public catalog (PINNED_CATEGORY_ORDER in the API).
const PINNED_GAMES = ['magic', 'pokemon', 'one piece', 'gundam', 'riftbound']

const UNCATEGORIZED = 'Uncategorized'

const normalize = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export const isSnacksOrAccessories = (name: string) => SNACKS_AND_ACCESSORIES.test(name)

const pinnedRank = (name: string) => {
  const index = PINNED_GAMES.indexOf(normalize(name))
  return index === -1 ? PINNED_GAMES.length : index
}

export interface CategorySections<T> {
  games: T[]
  snacksAndAccessories: T[]
}

// Games: pinned ones first, then the biggest. Snacks and accessories: by name.
// Uncategorized always last, in the games list, since it needs sorting out.
export const splitCategoryGroups = <T extends { name: string }>(
  groups: T[],
  sizeOf: (group: T) => number
): CategorySections<T> => {
  const games = groups
    .filter(group => !isSnacksOrAccessories(group.name))
    .sort((a, b) => {
      if (a.name === UNCATEGORIZED) return 1
      if (b.name === UNCATEGORIZED) return -1
      return (
        pinnedRank(a.name) - pinnedRank(b.name) ||
        sizeOf(b) - sizeOf(a) ||
        a.name.localeCompare(b.name)
      )
    })
  const snacksAndAccessories = groups
    .filter(group => isSnacksOrAccessories(group.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { games, snacksAndAccessories }
}
