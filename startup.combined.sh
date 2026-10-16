#!/bin/sh
set -eu
API_PID=""
NGINX_PID=""
shutdown() {
  trap - TERM INT EXIT
  # Children may already have exited; killing/reaping them is idempotent.
  for child in "$NGINX_PID" "$API_PID"; do
    if [ -n "$child" ]; then kill -TERM "$child" 2>/dev/null || :; fi
  done
  # Bound graceful shutdown so a stuck dependency cannot hang Fly termination.
  (sleep 12; for child in "$NGINX_PID" "$API_PID"; do
    if [ -n "$child" ]; then kill -KILL "$child" 2>/dev/null || :; fi
  done) &
  shutdown_timer=$!
  for child in "$NGINX_PID" "$API_PID"; do
    if [ -n "$child" ]; then wait "$child" 2>/dev/null || :; fi
  done
  kill "$shutdown_timer" 2>/dev/null || :
  wait "$shutdown_timer" 2>/dev/null || :
}
trap 'exit 0' TERM INT
trap shutdown EXIT
# Put the private admin path (Fly secret) into the built frontend. Refuse to
# start without it rather than serve the admin page at a guessable path.
# Like src/config/adminPath.ts, a missing leading slash is fine (the app adds
# it); node does the swap so no character in the path can break it.
if [ -z "${VITE_ADMIN_BASE_PATH:-}" ]; then
  echo "Set the VITE_ADMIN_BASE_PATH Fly secret (the private admin path)" >&2
  exit 1
fi
node -e '
  const fs = require("fs"), path = require("path")
  const value = JSON.stringify(process.env.VITE_ADMIN_BASE_PATH).slice(1, -1)
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(file)
    if (!file.endsWith(".js")) return
    const text = fs.readFileSync(file, "utf8")
    if (text.includes("__OUTPOST_ADMIN_BASE_PATH__"))
      fs.writeFileSync(file, text.split("__OUTPOST_ADMIN_BASE_PATH__").join(value))
  })
  walk("/usr/share/nginx/html")
'
cd /app/api
node server.js &
API_PID=$!
ready=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  kill -0 "$API_PID" 2>/dev/null || exit 1
  if wget -q -O- http://127.0.0.1:3001/api/health >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || exit 1
nginx -g 'daemon off;' &
NGINX_PID=$!
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do sleep 2; done
exit 1
