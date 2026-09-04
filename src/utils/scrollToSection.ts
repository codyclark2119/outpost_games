// Shared "scroll to an in-page section" retry loop, used by useSectionNav's
// header links and by Home.vue's arrive-with-a-hash handler.
//
// The retry exists because the sections below the fold are async-loaded
// (defineAsyncComponent), so the page is still growing for a moment after
// mount and a single scrollIntoView can target a not-yet-final layout.
//
// Two things the previous per-caller copies of this loop got wrong, both of
// which read to a visitor as "the page stopped responding":
//   1. Nothing cancelled an in-flight chain, so clicking About then Contact
//      left two chains re-issuing smooth scrolls to different targets at the
//      same time, and a manual scroll during either one got yanked back every
//      150ms for a second and a half.
//   2. The loop always burned all 10 attempts even once the layout had
//      settled, which is what made that window so long.
// So: one chain at a time (a new call cancels the old), and stop as soon as
// the target exists and the document has stopped growing.

let pendingRetry: number | null = null

export const cancelPendingSectionScroll = () => {
  if (pendingRetry !== null) {
    clearTimeout(pendingRetry)
    pendingRetry = null
  }
}

export const scrollToSectionId = (id: string, maxAttempts = 10, intervalMs = 150) => {
  cancelPendingSectionScroll()

  let attemptsLeft = maxAttempts
  let lastHeight = -1

  const attempt = () => {
    pendingRetry = null
    const el = document.getElementById(id)
    const height = document.documentElement.scrollHeight

    // Target is present and nothing new has loaded in below it since the last
    // attempt — the scroll already issued is the final one, leave it alone.
    if (el && height === lastHeight) return
    lastHeight = height

    // No explicit `behavior` — html { scroll-behavior: smooth } in style.css
    // decides, which means the prefers-reduced-motion override there
    // (scroll-behavior: auto !important) finally applies. Passing
    // behavior:'smooth' from JS beats CSS and silently ignored that setting.
    el?.scrollIntoView({ block: 'start' })
    attemptsLeft -= 1
    if (attemptsLeft > 0) pendingRetry = window.setTimeout(attempt, intervalMs)
  }

  attempt()
}
