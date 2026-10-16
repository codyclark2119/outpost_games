import { AppError } from '../middleware/errorHandler.js'
import crypto from 'node:crypto'
import { clientFromEnv } from './client.js'

// A Square-hosted checkout page for one product. Square takes the payment,
// asks the buyer for their contact details, and records the sale as an order
// against the catalog item, so the shop's stock count drops like any other
// sale. Nothing is held until the buyer actually pays.
export const createSquarePaymentLink = async (
  { variationId, quantity, redirectUrl, note },
  env = process.env
) => {
  const client = clientFromEnv(env)
  if (!client.locationId) throw new AppError(503, 'Square location is not configured')
  const payload = await client.request('/v2/online-checkout/payment-links', {
    method: 'POST',
    body: {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: client.locationId,
        line_items: [{ catalog_object_id: variationId, quantity: String(quantity) }],
      },
      checkout_options: {
        ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
        ask_for_shipping_address: false,
      },
      ...(note ? { payment_note: note } : {}),
    },
  })
  const url = payload.payment_link?.url
  if (!url) throw new Error('Square did not return a checkout link')
  return { url, orderId: payload.payment_link?.order_id || null }
}
