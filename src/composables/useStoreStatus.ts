import { computed } from 'vue'
import { useNow } from '@vueuse/core'
import { getStoreStatus } from '../utils/storeHours'

// Live open/closed status — re-evaluated every minute so a page left open
// across opening or closing time flips on its own.
export function useStoreStatus() {
  const now = useNow({ interval: 60_000 })
  return computed(() => getStoreStatus(now.value))
}
