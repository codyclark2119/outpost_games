import storeConfig from '../storeConfig.json' with { type: 'json' }

// ─── Warm-hours self-ping (belt-and-suspenders) ─────────────────────────────
// The .github/workflows/warm-hours.yml cron is the primary mechanism that
// guarantees the machine is awake for the noon-midnight America/Chicago
// window (see that file for the full DST-handling writeup). This is a
// fallback that keeps it warm for the *rest* of the window even if that
// workflow run fails or is delayed.
//
// This has to hit the machine through Fly's real public endpoint to count as
// activity — Fly's auto-stop watches for connections at its edge PROXY, not
// inside the process, so a plain in-process timer or a loopback fetch to
// 127.0.0.1 would be invisible to it and wouldn't actually prevent idle-stop.
// Off by default (WARM_WINDOW_SELF_PING unset) since the cron job above is
// sufficient on its own; this only adds redundancy.
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
  if (env.WARM_WINDOW_SELF_PING !== 'true') return
  const selfPingUrl =
    env.WARM_WINDOW_SELF_PING_URL ||
    (env.FLY_APP_NAME ? `https://${env.FLY_APP_NAME}.fly.dev/api/health` : null)

  if (!selfPingUrl) {
    console.warn(
      '⚠️  WARM_WINDOW_SELF_PING is set but no target URL could be determined (need FLY_APP_NAME or WARM_WINDOW_SELF_PING_URL) — skipping'
    )
    return
  }
  setInterval(() => {
    if (!isInsideWarmWindow()) return
    // Best-effort — a failed ping just means the next one tries again in
    // SELF_PING_INTERVAL_MS; nothing here should ever crash the process.
    fetch(selfPingUrl).catch(() => {})
  }, SELF_PING_INTERVAL_MS)
  console.log(
    `🔥 Warm-window self-ping enabled — pinging ${selfPingUrl} every ${SELF_PING_INTERVAL_MS / 1000}s from ${WARM_WINDOW_START_HOUR}:00 Central`
  )
}
