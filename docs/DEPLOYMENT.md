# Deployment

## How production runs

- **Fly.io** app `outpost-games-rgv` in `dfw`, one shared-CPU machine with 256 MB (`fly.toml`). It sleeps after about 5 idle minutes and wakes on the next request. `.github/workflows/warm-hours.yml` keeps it awake from noon to midnight Central.
- **One container** (`Dockerfile.combined`): Nginx serves the built Vue app and proxies `/api` to the Node API on `127.0.0.1:3001`. `startup.combined.sh` starts both and stops the container if either dies.
- **Redis** is Upstash (`REDIS_URL`, TLS detected from `upstash.io`). Without Redis in production the API answers 503 rather than losing data.
- **Cloudflare** sits in front of `outpostgamesrgv.com` (DNS, cache, HTTPS). Fly's own address, `https://outpost-games-rgv.fly.dev`, skips Cloudflare.

## Deploying

Merging to `main` deploys by itself. `.github/workflows/deploy.yml` waits for CI on `main` to pass, runs `flyctl deploy` for that exact commit, purges Cloudflare's cache if its secrets are set, and checks `https://outpost-games-rgv.fly.dev/api/health` until it reports `"status":"ok"`. It can also be started from the Actions tab.

A manual deploy from a laptop works the same way:

```bash
fly deploy
```

Every PR also builds the production image, so a broken Dockerfile shows up in CI first.

## Settings

Fly secrets (`fly secrets list`, `fly secrets set NAME=value`; setting one restarts the app):

| Secret                                                               | Needed for                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `REDIS_URL`                                                          | Everything stored: events, sessions, online-sales switches, restock pairs                          |
| `SQUARE_ENV`                                                         | `production` (anything else means sandbox)                                                         |
| `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID` | Products, admin catalog tools, checkout                                                            |
| `ADMIN_USERS`                                                        | Admin logins (JSON of `{ username, passwordHash }`)                                                |
| `VITE_ADMIN_BASE_PATH`                                               | The private admin path. The container writes it into the app at startup and won't start without it |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`                                   | Optional: the monthly inventory email                                                              |

GitHub repository secrets (Settings → Secrets and variables → Actions):

| Secret                                       | Needed for                                                     |
| -------------------------------------------- | -------------------------------------------------------------- |
| `FLY_API_TOKEN`                              | Deploys and warm hours (`fly tokens create deploy -x 999999h`) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | Optional: cache purge after each deploy                        |

Never put the admin path in the repo or in GitHub.

## When something breaks

See what the machine is doing:

```bash
fly logs -a outpost-games-rgv --no-tail | tail -40
fly status -a outpost-games-rgv
```

Roll back to an earlier image:

```bash
fly releases --image -a outpost-games-rgv
fly deploy --image <image from the list> -a outpost-games-rgv
```

The next merge to `main` deploys again, so fix the cause before merging anything else.

## Local full stack

`local-dev/` runs the API, Redis and the frontend in Docker (`npm run docker:setup`, then `npm run docker:rebuild` after changes). See `local-dev/README.md`.
