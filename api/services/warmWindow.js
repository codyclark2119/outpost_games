import storeConfig from '../storeConfig.json' with { type: 'json' }

// ─── Warm-hours self-ping ───────────────────────────────────────────────────
// Keeps the machine awake from noon to midnight Central. The
// .github/workflows/warm-hours.yml cron starts the machine at noon, but Fly's
// proxy stops any machine that sees no traffic for a few minutes, however it
// was started (min_machines_running is 0). So while the window is open, the
// server pings itself every 2 minutes.
//
// The ping has to go through Fly's public endpoint to count as traffic: the
// auto-stop watches connections at Fly's edge proxy, so a loopback request to
// 127.0.0.1 would be invisible to it. On by default on Fly; set
// WARM_WINDOW_SELF_PING=false to turn it off. After midnight the pings stop
// and the machine goes back to sleeping when idle.
const WARM_WINDOW_START_HOUR = 12 // noon — keep in sync with the cron schedule in warm-hours.yml
const SELF_PING_INTERVAL_MS = 2 * 60 * 1000 // well under Fly's ~5 min idle-stop timeout

const isInsideWarmWindow = () => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: storeConfig.timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  )
  return hour >= WARM_WINDOW_START_HOUR
}

export function startWarmWindowSelfPing(env = process.env) {
  if (env.WARM_WINDOW_SELF_PING === 'false') return
  const selfPingUrl =
    env.WARM_WINDOW_SELF_PING_URL ||
    (env.FLY_APP_NAME ? `https://${env.FLY_APP_NAME}.fly.dev/api/health` : null)

  if (!selfPingUrl) {
    return // not on Fly (local dev, tests): nothing to keep awake
  }
  setInterval(() => {
    if (!isInsideWarmWindow()) return
    // Best-effort — a failed ping just means the next one tries again in
    // SELF_PING_INTERVAL_MS; nothing here should ever crash the process.
    fetch(selfPingUrl)
      .then(response => response.body?.cancel())
      .catch(() => {})
  }, SELF_PING_INTERVAL_MS)
  console.log(
    `🔥 Warm-window self-ping enabled — pinging ${selfPingUrl} every ${SELF_PING_INTERVAL_MS / 1000}s from ${WARM_WINDOW_START_HOUR}:00 Central`
  )
}
