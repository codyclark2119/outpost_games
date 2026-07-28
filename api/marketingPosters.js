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

// "avatar-last-airbender.jpg" -> "Avatar Last Airbender"
const titleFromFilename = filename =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

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
    .sort((a, b) => a.localeCompare(b))
    .map(filename => ({
      id: path.basename(filename, path.extname(filename)),
      title: titleFromFilename(filename),
      imageUrl: `/wpn-assets/posters/${filename}`,
    }))
}
