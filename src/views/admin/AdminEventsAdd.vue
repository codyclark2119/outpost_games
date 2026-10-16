<template>
  <AdminPage
    title="Add an event"
    subtitle="Tournaments, prereleases and other one-off nights."
    width="narrow"
    :back="{ to: { name: 'AdminEvents' }, label: 'All events' }"
  >
    <transition name="slide-down">
      <div
        v-if="added"
        class="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
        role="status"
      >
        <p class="font-semibold">“{{ added }}” is saved.</p>
        <p class="mt-1 text-sm">
          The form is clear if you want to add another, or
          <router-link :to="{ name: 'AdminEvents' }" class="font-semibold underline"
            >see all events</router-link
          >.
        </p>
      </div>
    </transition>

    <div class="card">
      <EventForm
        ref="formRef"
        submit-label="Save event"
        :saving="submitting"
        @submit="handleSubmit"
      />
    </div>
  </AdminPage>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminPage from '../../components/admin/AdminPage.vue'
import EventForm, { type EventPayload } from '../../components/admin/EventForm.vue'
import { useEventsStore } from '../../stores/events'
import { useSquareCatalogStore } from '../../stores/squareCatalog'

const eventsStore = useEventsStore()
const catalogStore = useSquareCatalogStore()

const formRef = ref<InstanceType<typeof EventForm> | null>(null)
const submitting = ref(false)
const added = ref('')

const handleSubmit = async (payload: EventPayload) => {
  if (submitting.value) return
  submitting.value = true
  added.value = ''
  try {
    await eventsStore.addEvent(payload)
    added.value = payload.title
    formRef.value?.reset()
    window.scrollTo({ top: 0 })
  } catch (e) {
    formRef.value?.setError(e instanceof Error ? e.message : 'The event could not be saved.')
  } finally {
    submitting.value = false
  }
}

onMounted(() => catalogStore.ensureCatalog())
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
