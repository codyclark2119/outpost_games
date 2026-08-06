import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface WeeklyOverride {
  id: string
  weeklyEventId: string
  date: string // ISO date (YYYY-MM-DD) of the specific occurrence being hidden
  reason?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const useWeeklyOverridesStore = defineStore('weeklyOverrides', () => {
  const overrides = ref<WeeklyOverride[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchOverrides = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/weekly-overrides`)
      if (!response.ok) {
        throw new Error('Failed to fetch weekly overrides')
      }
      const data = await response.json()
      overrides.value = data
    } catch (e) {
      console.error('Error fetching weekly overrides:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch weekly overrides'
    } finally {
      loading.value = false
    }
  }

  const addOverride = async (override: Omit<WeeklyOverride, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/weekly-overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(override),
      })
      if (!response.ok) {
        throw new Error('Failed to add weekly override')
      }
      const newOverride = await response.json()
      overrides.value.push(newOverride)
      return newOverride
    } catch (e) {
      console.error('Error adding weekly override:', e)
      error.value = e instanceof Error ? e.message : 'Failed to add weekly override'
      throw e
    } finally {
      loading.value = false
    }
  }

  const removeOverride = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/weekly-overrides/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to remove weekly override')
      }
      overrides.value = overrides.value.filter(o => o.id !== id)
    } catch (e) {
      console.error('Error removing weekly override:', e)
      error.value = e instanceof Error ? e.message : 'Failed to remove weekly override'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    overrides,
    loading,
    error,
    fetchOverrides,
    addOverride,
    removeOverride,
  }
})
