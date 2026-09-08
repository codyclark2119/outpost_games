import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch } from '../services/api'
export interface WeeklyOverride {
  id: string
  weeklyEventId: string
  date: string
  reason?: string
}
export const useWeeklyOverridesStore = defineStore('weeklyOverrides', () => {
  const overrides = ref<WeeklyOverride[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fetchOverrides = async () => {
    loading.value = true
    error.value = null
    try {
      overrides.value = await apiFetch<WeeklyOverride[]>('/weekly-overrides')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch weekly overrides'
    } finally {
      loading.value = false
    }
  }
  const addOverride = async (override: Omit<WeeklyOverride, 'id'>) => {
    if (loading.value) throw new Error('An operation is already in progress')
    loading.value = true
    error.value = null
    try {
      const n = await apiFetch<WeeklyOverride>('/weekly-overrides', {
        method: 'POST',
        body: JSON.stringify(override),
      })
      overrides.value.push(n)
      return n
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add weekly override'
      throw e
    } finally {
      loading.value = false
    }
  }
  const removeOverride = async (id: string) => {
    if (loading.value) throw new Error('An operation is already in progress')
    loading.value = true
    error.value = null
    try {
      await apiFetch(`/weekly-overrides/${encodeURIComponent(id)}`, { method: 'DELETE' })
      overrides.value = overrides.value.filter(o => o.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove weekly override'
      throw e
    } finally {
      loading.value = false
    }
  }
  return { overrides, loading, error, fetchOverrides, addOverride, removeOverride }
})
