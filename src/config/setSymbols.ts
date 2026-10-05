import badgeUrl from '../assets/outpost-badge.webp'
import { slugify } from '../stores/squareCatalog'

// Stand-in artwork for products that have no photo in Square yet. Set symbols
// live in src/assets/set-symbols/ named after the slug of the Square set
// (sub-category) name — "Reality Fracture" -> reality-fracture.webp — so a new
// set is covered by dropping its symbol in there, no code change.
const files = import.meta.glob<string>('../assets/set-symbols/*.{webp,png,svg}', {
  eager: true,
  import: 'default',
})
const SET_SYMBOLS = new Map(
  Object.entries(files).map(([file, url]) => [
    file
      .split('/')
      .pop()!
      .replace(/\.\w+$/, ''),
    url,
  ])
)

// The product's set symbol when we have one, otherwise the shop's own logo.
// Items filed straight under a game (no set sub-category) still get their
// set's symbol when the product name spells the set out, e.g.
// "Magic the Gathering | Reality Fracture Bundle".
export const placeholderArt = (setName: string | null, productName: string) => {
  const nameSlug = `-${slugify(productName)}-`
  const symbol =
    (setName ? SET_SYMBOLS.get(slugify(setName)) : undefined) ??
    [...SET_SYMBOLS].find(([setSlug]) => nameSlug.includes(`-${setSlug}-`))?.[1]
  return symbol ? { url: symbol, kind: 'set' as const } : { url: badgeUrl, kind: 'logo' as const }
}
