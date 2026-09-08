import { reactive } from 'vue'
const state = reactive({ open: false, message: '' })
let resolve: ((confirmed: boolean) => void) | undefined
export function useConfirmation() {
  const ask = (message: string) => {
    if (state.open) return Promise.resolve(false)
    state.message = message
    state.open = true
    return new Promise<boolean>(done => {
      resolve = done
    })
  }
  const answer = (confirmed: boolean) => {
    state.open = false
    resolve?.(confirmed)
    resolve = undefined
  }
  return { state, ask, answer }
}
