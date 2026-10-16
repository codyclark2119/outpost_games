// Rules for selling a product online through a Square checkout link.
//
// Online ordering starts with Magic: The Gathering only, and only for items an
// admin has switched on. Some stock always stays at the shop for walk-in
// customers, so an online buyer can never clear a product out: one of every
// larger product (booster boxes, bundles, decks) and five of every booster pack.

export const SHOP_RESERVE_LARGE = 1
export const SHOP_RESERVE_PACK = 5

// The top-level Square category for Magic is "Magic" today; matching the
// leading word also covers a rename to "Magic: The Gathering".
export const isMagicCategory = name => /^magic\b/i.test(String(name || '').trim())

// A single booster pack, as opposed to a box or bundle *of* packs, a
// prerelease kit, or a display.
const PACK = /\bpacks?\b/i
const LARGER_THAN_A_PACK = /\b(box|boxes|display|case|bundle|kit|prerelease)\b/i
export const isPackSized = name => PACK.test(name || '') && !LARGER_THAN_A_PACK.test(name || '')

export const shopReserve = name => (isPackSized(name) ? SHOP_RESERVE_PACK : SHOP_RESERVE_LARGE)

// How many of a product can be bought online right now: what's on the shelf
// minus what the shop keeps back. Never negative.
export const onlineQuantity = (onHand, name) => {
  const count = Math.floor(Number(onHand))
  if (!Number.isFinite(count)) return 0
  return Math.max(0, count - shopReserve(name))
}
