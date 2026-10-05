// Display polish for the game sections the public catalog derives from Square's
// top-level categories (keyed by the same slug as /products/:typeId). Purely
// cosmetic: a category missing here still shows up everywhere, just under its
// Square name with the neutral accent — adding a new game needs no code change.
interface GameMeta {
  label: string // short name for chips and tiles
  title: string // full name for page headings
  accent: string
}

const GAME_META: Record<string, GameMeta> = {
  magic: { label: 'Magic', title: 'Magic: The Gathering', accent: 'var(--color-game-magic)' },
  pokemon: { label: 'Pokémon', title: 'Pokémon', accent: 'var(--color-game-pokemon)' },
  'one-piece': { label: 'One Piece', title: 'One Piece', accent: 'var(--color-game-onepiece)' },
  gundam: { label: 'Gundam', title: 'Gundam', accent: 'var(--color-game-gundam)' },
  riftbound: { label: 'Riftbound', title: 'Riftbound', accent: 'var(--color-game-riftbound)' },
  digimon: { label: 'Digimon', title: 'Digimon', accent: '#f08a24' },
  'union-arena': { label: 'Union Arena', title: 'Union Arena', accent: '#d8366e' },
  lorcana: { label: 'Lorcana', title: 'Disney Lorcana', accent: '#7b5cd6' },
}

const FALLBACK_ACCENT = 'var(--color-outpost-stone-light)'

export const gameMeta = (slug: string, squareName: string): GameMeta =>
  GAME_META[slug] ?? { label: squareName.trim(), title: squareName.trim(), accent: FALLBACK_ACCENT }

// Shown when the live catalog has nothing to list (not yet live, or mid-recount).
export const HEADLINE_GAMES = ['magic', 'pokemon', 'one-piece', 'gundam', 'riftbound'].map(
  slug => ({ slug, ...GAME_META[slug]! })
)
