import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SpecialEvent {
  id: string
  title: string
  date: string
  time: string
  entry: string
  description: string
  gameTypeId?: string
  gameTypeName?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const useEventsStore = defineStore('events', () => {
  const upcomingEvents = ref<SpecialEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch all events from API
  const fetchEvents = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/events`)
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      upcomingEvents.value = data
    } catch (e) {
      console.error('Error fetching events:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch events'
    } finally {
      loading.value = false
    }
  }

  // Add new event
  const addEvent = async (event: Omit<SpecialEvent, 'id'>) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      if (!response.ok) {
        throw new Error('Failed to add event')
      }
      const newEvent = await response.json()
      upcomingEvents.value.push(newEvent)
    } catch (e) {
      console.error('Error adding event:', e)
      error.value = e instanceof Error ? e.message : 'Failed to add event'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Update existing event
  const updateEvent = async (id: string, updatedEvent: Partial<SpecialEvent>) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      })
      if (!response.ok) {
        throw new Error('Failed to update event')
      }
      const updated = await response.json()
      const index = upcomingEvents.value.findIndex(e => e.id === id)
      if (index !== -1) {
        upcomingEvents.value[index] = updated
      }
    } catch (e) {
      console.error('Error updating event:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update event'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Delete event
  const deleteEvent = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete event')
      }
      upcomingEvents.value = upcomingEvents.value.filter(e => e.id !== id)
    } catch (e) {
      console.error('Error deleting event:', e)
      error.value = e instanceof Error ? e.message : 'Failed to delete event'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Reset to default events
  const resetToDefaults = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/events/reset`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to reset events')
      }
      const data = await response.json()
      upcomingEvents.value = data
    } catch (e) {
      console.error('Error resetting events:', e)
      error.value = e instanceof Error ? e.message : 'Failed to reset events'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    upcomingEvents,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    resetToDefaults,
  }
})
