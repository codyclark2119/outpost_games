import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch, ApiError, onSessionExpired } from '../services/api'
interface AuthResponse {
  username: string
}
export const useAuthStore = defineStore('auth', () => {
  const username = ref<string | null>(null)
  const checked = ref(false)
  onSessionExpired(() => {
    username.value = null
    checked.value = true
  })
  const initAuth = async () => {
    try {
      username.value = (
        await apiFetch<AuthResponse>('/auth/me', { skipAuthRedirect: true })
      ).username
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401)
        console.error('Unable to verify admin session:', e)
      username.value = null
    } finally {
      checked.value = true
    }
  }
  const login = async (user: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: user, password }),
      skipAuthRedirect: true,
    })
    username.value = data.username
    checked.value = true
  }
  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', skipAuthRedirect: true })
    } finally {
      username.value = null
      checked.value = true
    }
  }
  return { username, checked, initAuth, login, logout }
})
