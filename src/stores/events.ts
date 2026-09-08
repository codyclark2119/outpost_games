import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch } from '../services/api'
export interface SpecialEvent {
  id: string
  title: string
  date: string
  time: string
  entry: string
  description: string
  gameTypeId?: string
  gameTypeName?: string
  isVisible?: boolean
}
export const useEventsStore = defineStore('events', () => {
  const upcomingEvents = ref<SpecialEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fetchEvents = async () => {
    loading.value = true
    error.value = null
    try {
      upcomingEvents.value = await apiFetch<SpecialEvent[]>('/events')
    } catch (e) {
      console.error('Error fetching events:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch events'
    } finally {
      loading.value = false
    }
  }
  const addEvent = async (event: Omit<SpecialEvent, 'id'>) => {
    if (loading.value) throw new Error('An operation is already in progress')
    loading.value = true
    error.value = null
    try {
      const n = await apiFetch<SpecialEvent>('/events', {
        method: 'POST',
        body: JSON.stringify(event),
      })
      upcomingEvents.value.push(n)
      return n
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add event'
      throw e
    } finally {
      loading.value = false
    }
  }
  const updateEvent = async (id: string, updatedEvent: Partial<SpecialEvent>) => {
    if (loading.value) throw new Error('An operation is already in progress')
    loading.value = true
    error.value = null
    try {
      const u = await apiFetch<SpecialEvent>(`/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updatedEvent),
      })
      const i = upcomingEvents.value.findIndex(e => e.id === id)
      if (i !== -1) upcomingEvents.value[i] = u
      return u
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update event'
      throw e
    } finally {
      loading.value = false
    }
  }
  const deleteEvent = async (id: string) => {
    if (loading.value) throw new Error('An operation is already in progress')
    loading.value = true
    error.value = null
    try {
      await apiFetch(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
      upcomingEvents.value = upcomingEvents.value.filter(e => e.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete event'
      throw e
    } finally {
      loading.value = false
    }
  }
  return { upcomingEvents, loading, error, fetchEvents, addEvent, updateEvent, deleteEvent }
})
