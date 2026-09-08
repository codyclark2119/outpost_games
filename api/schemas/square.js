import { object, string, number, boolean, ids, invalid, validIsoDate } from './validation.js'
const optionalId = (value, name) => {
  if (value !== null) string(value, name)
}
const date = value => {
  if (value !== null && !validIsoDate(value))
    invalid('releasedAt must be a real YYYY-MM-DD date or null')
}
function variation(body, creating = false) {
  object(
    body,
    creating
      ? ['name', 'sku', 'priceCents', 'trackInventory', 'sellable']
      : ['id', 'name', 'priceCents', 'costCents', 'trackInventory', 'sellable'],
    creating ? ['name'] : ['id']
  )
  for (const f of ['id', 'name', 'sku'])
    if (f in body) string(body[f], f, f === 'name' && !creating)
  for (const f of ['priceCents', 'costCents'])
    if (f in body && body[f] !== null) number(body[f], f, 0, true)
  for (const f of ['trackInventory', 'sellable']) if (f in body) boolean(body[f], f)
}
export function validateSquareMutation(req, res, next) {
  try {
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next()
    const path = req.path,
      body = req.body
    if (req.method === 'DELETE' || path.endsWith('/image')) return next()
    if (/\/products\/batch-/.test(path)) {
      const fields = path.endsWith('batch-delete')
        ? []
        : path.endsWith('batch-category')
          ? ['categoryId']
          : path.endsWith('batch-released-at')
            ? ['releasedAt']
            : ['hiddenFromWeb', 'sellable']
      object(body, ['itemIds', ...fields], ['itemIds'])
      ids(body.itemIds, 'itemIds')
      if ('categoryId' in body) optionalId(body.categoryId, 'categoryId')
      if ('releasedAt' in body) date(body.releasedAt)
      for (const f of ['hiddenFromWeb', 'sellable']) if (f in body) boolean(body[f], f)
    } else if (/\/products\/[^/]+$/.test(path) && req.method === 'PUT') {
      object(body, [
        'name',
        'description',
        'categoryIds',
        'hiddenFromWeb',
        'releasedAt',
        'variations',
      ])
      if (!Object.keys(body).length) invalid('At least one field is required')
      if ('name' in body) string(body.name, 'name')
      if ('description' in body) string(body.description, 'description', true)
      if ('categoryIds' in body) ids(body.categoryIds, 'categoryIds', true)
      if ('hiddenFromWeb' in body) boolean(body.hiddenFromWeb, 'hiddenFromWeb')
      if ('releasedAt' in body) date(body.releasedAt)
      if ('variations' in body) {
        if (!Array.isArray(body.variations)) invalid('variations must be an array')
        body.variations.forEach(v => variation(v))
        ids(
          body.variations.map(v => v.id),
          'variation IDs',
          true
        )
      }
    } else if (path.endsWith('/variations')) variation(body, true)
    else if (path.endsWith('/inventory')) {
      object(body, ['variationId', 'quantity'], ['variationId', 'quantity'])
      string(body.variationId, 'variationId')
      number(body.quantity, 'quantity')
    } else if (path.endsWith('/inventory/batch')) {
      object(body, ['changes'], ['changes'])
      if (!Array.isArray(body.changes) || !body.changes.length)
        invalid('changes must be a non-empty array')
      body.changes.forEach(c => {
        object(c, ['variationId', 'quantity'], ['variationId', 'quantity'])
        string(c.variationId, 'variationId')
        number(c.quantity, 'quantity')
      })
      ids(
        body.changes.map(c => c.variationId),
        'variation IDs'
      )
    } else if (/\/categories(?:\/|$)/.test(path)) {
      const fields = path.endsWith('/merge')
        ? ['toCategoryId']
        : path.endsWith('/parent')
          ? ['parentCategoryId']
          : req.method === 'PUT'
            ? ['name']
            : ['name', 'parentCategoryId']
      object(body, fields, [fields[0]])
      for (const f of fields)
        if (f in body) f === 'parentCategoryId' ? optionalId(body[f], f) : string(body[f], f)
    } else if (path.endsWith('/restock-mappings')) {
      object(
        body,
        ['boxVariationId', 'boxName', 'packsVariationId', 'packsName', 'packsPerBox'],
        ['boxVariationId', 'packsVariationId', 'packsPerBox']
      )
      for (const f of ['boxVariationId', 'packsVariationId', 'boxName', 'packsName'])
        if (f in body) string(body[f], f, f.endsWith('Name'))
      number(body.packsPerBox, 'packsPerBox', 1, true)
    } else if (/\/restock-mappings\/[^/]+\/apply$/.test(path)) {
      object(body, ['boxesOpened'], ['boxesOpened'])
      number(body.boxesOpened, 'boxesOpened', 1, true)
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function validImageUpload(file, metadata) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    !file.buffer.length ||
    (metadata && Object.keys(metadata).length)
  )
    return false
  const bytes = file.buffer
  if (['image/jpeg', 'image/pjpeg'].includes(file.mimetype))
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (file.mimetype === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (file.mimetype === 'image/gif')
    return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))
  return false
}
