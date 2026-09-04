import { useRouter, useRoute } from 'vue-router'
import { scrollToSectionId } from '../utils/scrollToSection'

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
      scrollToSectionId(id)
    } else {
      router.push({ path: '/', hash: `#${id}` })
    }
  }

  return { goToSection }
}
