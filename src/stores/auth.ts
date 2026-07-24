import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const useAuthStore = defineStore('auth', () => {
  const username = ref<string | null>(null)
  const checked = ref(false)

  const initAuth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`)
      username.value = res.ok ? (await res.json()).username : null
    } catch {
      username.value = null
    } finally {
      checked.value = true
    }
  }

  const login = async (user: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Login failed')
    }
    const data = await res.json()
    username.value = data.username
    checked.value = true
  }

  const logout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' })
    username.value = null
  }

  return { username, checked, initAuth, login, logout }
})
