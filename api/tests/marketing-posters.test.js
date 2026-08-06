import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { listMarketingPosters } from '../marketingPosters.js'

const withPostersDir = async (filenames, run) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'marketing-posters-'))
  try {
    for (const filename of filenames) {
      await fs.writeFile(path.join(dir, filename), '')
    }
    await run(dir)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

test('orders numeric-prefixed files numerically before unprefixed alphabetical files', async () => {
  await withPostersDir(
    ['10-last.png', '02-second.png', 'zebra.png', '01-first.png', 'apple.png'],
    async dir => {
      const posters = await listMarketingPosters({ MARKETING_POSTERS_DIR: dir })
      assert.deepEqual(
        posters.map(p => p.title),
        ['First', 'Second', 'Last', 'Apple', 'Zebra']
      )
    }
  )
})

test('strips numeric prefix from the title but not from unprefixed filenames', async () => {
  await withPostersDir(['01-summer-sale.png', '02_fall_event.png', 'MtG: The Hobbit.png'], async dir => {
    const posters = await listMarketingPosters({ MARKETING_POSTERS_DIR: dir })
    const byId = Object.fromEntries(posters.map(p => [p.id, p.title]))
    assert.equal(byId['01-summer-sale'], 'Summer Sale')
    assert.equal(byId['02_fall_event'], 'Fall Event')
    // Regression guard: existing non-numeric filenames must title-case exactly as before
    // (titleFromFilename only uppercases each word's first character, it never
    // lowercases the rest — "MtG" stays "MtG").
    assert.equal(byId['MtG: The Hobbit'], 'MtG: The Hobbit')
  })
})

test('breaks ties between equal numeric prefixes alphabetically', async () => {
  await withPostersDir(['05-zebra.png', '05-apple.png'], async dir => {
    const posters = await listMarketingPosters({ MARKETING_POSTERS_DIR: dir })
    assert.deepEqual(
      posters.map(p => p.title),
      ['Apple', 'Zebra']
    )
  })
})

test('ignores non-image files and ENOENT returns an empty array', async () => {
  await withPostersDir(['notes.txt', '01-poster.png'], async dir => {
    const posters = await listMarketingPosters({ MARKETING_POSTERS_DIR: dir })
    assert.equal(posters.length, 1)
    assert.equal(posters[0].title, 'Poster')
  })

  const missing = await listMarketingPosters({ MARKETING_POSTERS_DIR: '/nonexistent/path/for/posters' })
  assert.deepEqual(missing, [])
})
