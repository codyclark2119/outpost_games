import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Loads the repo-root .env. Imported first by server.js and by the Square
// client, so scripts and tests that skip server.js see the same settings.
// dotenv's default lookup is relative to process.cwd(), which is api/ under
// `cd api && npm run dev`, so the path is explicit. A value already in the
// environment (shell, Docker, Fly secrets) always wins over the file.
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'),
  quiet: true,
})
