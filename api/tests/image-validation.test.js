import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validImageUpload } from '../schemas/square.js'
test('image validation rejects spoofed MIME and unexpected metadata', () => {
  const file = { mimetype: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }
  assert.equal(validImageUpload(file, {}), true)
  assert.equal(validImageUpload({ ...file, buffer: Buffer.from('<script>') }, {}), false)
  assert.equal(validImageUpload(file, { objectId: 'different-target' }), false)
  assert.equal(validImageUpload(null, {}), false)
})
