import { AppError } from '../middleware/errorHandler.js'
export const invalid = message => {
  throw new AppError(400, message)
}
export const object = (body, fields, required = []) => {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    invalid('Request body must be a JSON object')
  for (const key of Object.keys(body)) if (!fields.includes(key)) invalid(`Unknown field: ${key}`)
  for (const key of required) if (!(key in body)) invalid(`${key} is required`)
  return body
}
export const string = (value, name, empty = false) => {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > 10000)
    invalid(`${name} must be a ${empty ? '' : 'non-empty '}string`)
}
export const number = (value, name, min = 0, integer = false) => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > Number.MAX_SAFE_INTEGER ||
    (integer && !Number.isSafeInteger(value))
  )
    invalid(`${name} must be a valid ${integer ? 'integer' : 'number'} >= ${min}`)
}
export const boolean = (value, name) => {
  if (typeof value !== 'boolean') invalid(`${name} must be a boolean`)
}
export const ids = (value, name, empty = false) => {
  if (!Array.isArray(value) || (!empty && !value.length) || value.length > 10000)
    invalid(`${name} must be an array of IDs`)
  value.forEach(id => string(id, name))
  if (new Set(value).size !== value.length) invalid(`${name} contains duplicate IDs`)
}
export const validIsoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number),
    date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}
export const validate = schema => (req, res, next) => {
  try {
    schema(req.body)
    next()
  } catch (error) {
    next(error)
  }
}
