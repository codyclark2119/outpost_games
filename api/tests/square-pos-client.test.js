import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createSquarePosClient,
  buildSquareApiUrl,
  resolveSquareEnvironment,
} from '../squarePosClient.js'

test('defaults to the Square sandbox environment for local development', () => {
  const environment = resolveSquareEnvironment({})

  assert.equal(environment, 'sandbox')
})

test('builds sandbox API URLs with the sandbox host', () => {
  const url = buildSquareApiUrl('/v2/locations', 'sandbox')

  assert.equal(url, 'https://connect.squareupsandbox.com/v2/locations')
})

test('builds production API URLs with the production host', () => {
  const url = buildSquareApiUrl('/v2/locations', 'production')

  assert.equal(url, 'https://connect.squareup.com/v2/locations')
})

test('creates a client that sends the access token in the Authorization header', () => {
  const client = createSquarePosClient({
    accessToken: 'sandbox-token',
    environment: 'sandbox',
  })

  assert.equal(client.environment, 'sandbox')
  assert.equal(client.baseUrl, 'https://connect.squareupsandbox.com')
  assert.equal(client.headers.Authorization, 'Bearer sandbox-token')
})
