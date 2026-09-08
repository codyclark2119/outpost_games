import { validIsoDate } from './validation.js'
const validEventDate = value => {
  if (typeof value !== 'string') return false
  if (/^\d{4}-/.test(value)) return validIsoDate(value)
  if (!/^(?:[A-Za-z]+,?\s+)?[A-Za-z]+\s+\d{1,2},?\s+\d{4}$/.test(value.trim())) return false
  const parsed = new Date(`${value.trim()} 12:00:00 UTC`)
  const day = Number(value.match(/\b(\d{1,2})\b/)?.[1])
  return !Number.isNaN(parsed.getTime()) && parsed.getUTCDate() === day
}
const validEventTime = value => {
  const m = typeof value === 'string' && value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  return Boolean(m && +m[1] >= 1 && +m[1] <= 12 && +m[2] <= 59)
}
const EVENT_FIELDS = new Set([
  'title',
  'date',
  'time',
  'entry',
  'description',
  'gameTypeId',
  'gameTypeName',
  'isVisible',
])
export const validateEvent = (body, partial = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { error: 'Request body must be a JSON object' }
  const unknown = Object.keys(body).filter(k => !EVENT_FIELDS.has(k))
  if (unknown.length) return { error: `Unknown event fields: ${unknown.join(', ')}` }
  for (const f of ['title', 'entry', 'description'])
    if (f in body && (typeof body[f] !== 'string' || !body[f].trim()))
      return { error: `${f} must be a non-empty string` }
  if (!partial) {
    for (const f of ['title', 'date', 'time', 'entry', 'description'])
      if (!(f in body)) return { error: `${f} is required` }
  } else if (!Object.keys(body).length) return { error: 'At least one field is required' }
  if ('date' in body && !validEventDate(body.date)) return { error: 'date is invalid' }
  if ('time' in body && !validEventTime(body.time))
    return { error: 'time must use h:mm AM/PM format' }
  for (const f of ['gameTypeId', 'gameTypeName'])
    if (f in body && typeof body[f] !== 'string') return { error: `${f} must be a string` }
  if ('isVisible' in body && typeof body.isVisible !== 'boolean')
    return { error: 'isVisible must be a boolean' }
  return {
    value: Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    ),
  }
}
