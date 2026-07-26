import { useRouter, useRoute } from 'vue-router'

// Navigates to an in-page section on the single-page Home. When already on
// '/', scrolls directly; otherwise routes to '/' with a hash and lets
// Home.vue's onMounted hash-handling scroll to it once mounted. Mirrors the
// scrollToSection pattern already used by Products.vue's sidebar.
export function useSectionNav() {
  const router = useRouter()
  const route = useRoute()

  function goToSection(id: string | undefined) {
    if (!id) return
    if (route.path === '/') {
      // Async-loaded sections further down the page may still be resolving —
      // a single scrollIntoView can target a not-yet-final layout, so retry
      // briefly to self-correct as they load in.
      let attemptsLeft = 10
      const tryScroll = () => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        attemptsLeft -= 1
        if (attemptsLeft > 0) setTimeout(tryScroll, 150)
      }
      tryScroll()
    } else {
      router.push({ path: '/', hash: `#${id}` })
    }
  }

  return { goToSection }
}
