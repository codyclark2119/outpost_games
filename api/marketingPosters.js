// ─── Marketing posters (homepage carousel) ───────────────────────────────────
// Fully filesystem-driven: drop an image into public/wpn-assets/posters/ and it
// appears in the homepage carousel automatically — no admin step, no Redis
// record. Replaces the old admin-managed Featured Items CRUD, which existed
// solely to power this same carousel.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'])

// Resolves to <repo-root>/public/wpn-assets/posters by default. In the combined
// production Docker image this is populated by an explicit COPY step (see
// Dockerfile.combined) since the API and the built frontend are otherwise
// separate copies; MARKETING_POSTERS_DIR lets any deployment override it
// (e.g. local-dev's docker-compose, where the API runs from a differently
// shaped container and gets the folder volume-mounted elsewhere instead).
const defaultPostersDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'wpn-assets', 'posters')

const resolvePostersDir = (env = process.env) =>
  env.MARKETING_POSTERS_DIR ? path.resolve(env.MARKETING_POSTERS_DIR) : defaultPostersDir()

// Optional leading numeric prefix used purely to control display order, e.g.
// "01-summer-sale.png" or "02_fall_event.png" — stripped before the title is
// derived. Filenames without a matching prefix are untouched (order: null).
const NUMERIC_PREFIX_RE = /^(\d+)[-_.\s]+(.*)$/

const parsePrefixedFilename = filename => {
  const base = path.basename(filename, path.extname(filename))
  const match = base.match(NUMERIC_PREFIX_RE)
  return match ? { order: parseInt(match[1], 10), rest: match[2] } : { order: null, rest: base }
}

// "avatar-last-airbender.jpg" -> "Avatar Last Airbender"
// "01-avatar-last-airbender.jpg" -> "Avatar Last Airbender" (prefix stripped)
const titleFromFilename = filename =>
  parsePrefixedFilename(filename)
    .rest.replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

// Numeric-prefixed files sort first (numerically), everything else follows in
// alphabetical order — lets the shop owner pin a few posters to the front
// without having to renumber every existing file.
const comparePosterFilenames = (a, b) => {
  const pa = parsePrefixedFilename(a)
  const pb = parsePrefixedFilename(b)
  if (pa.order !== null && pb.order !== null) return pa.order - pb.order || a.localeCompare(b)
  if (pa.order !== null) return -1
  if (pb.order !== null) return 1
  return a.localeCompare(b)
}

let warnedMissingDir = false

export const listMarketingPosters = async (env = process.env) => {
  const dir = resolvePostersDir(env)

  let entries
  try {
    entries = await fs.readdir(dir)
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (!warnedMissingDir) {
        console.warn(`⚠️  Marketing posters directory not found (${dir}) — carousel will be empty`)
        warnedMissingDir = true
      }
      return []
    }
    throw error
  }

  return entries
    .filter(filename => IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase()))
    .sort(comparePosterFilenames)
    .map(filename => ({
      // id keeps any numeric prefix (it's only ever used as a Vue :key, never
      // displayed) — title is the one place the prefix is stripped.
      id: path.basename(filename, path.extname(filename)),
      title: titleFromFilename(filename),
      imageUrl: `/wpn-assets/posters/${filename}`,
    }))
}
