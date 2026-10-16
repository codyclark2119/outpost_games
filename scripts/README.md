# Scripts

- `purge-cloudflare.sh`: steps for purging Cloudflare's cache by hand, plus a quick check that the site and the direct Fly address serve the same data. Only needed when the deploy workflow's Cloudflare secrets aren't set.

Square maintenance scripts live in `api/scripts/` (see the main README). Deployment is described in [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
