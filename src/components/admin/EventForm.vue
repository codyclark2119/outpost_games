<template>
  <!-- One form for both adding and editing an event, so the two can never drift
       apart again (they used to be separate copies with different fields). -->
  <form class="space-y-5" @submit.prevent="submit">
    <div>
      <label :for="`${uid}-title`" class="field-label">Event name</label>
      <input
        :id="`${uid}-title`"
        v-model="form.title"
        type="text"
        required
        class="input-field"
        placeholder="e.g. Foundations Prerelease"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label :for="`${uid}-date`" class="field-label">Date</label>
        <input
          :id="`${uid}-date`"
          v-model="form.dateISO"
          type="date"
          required
          class="input-field"
        />
      </div>
      <div>
        <label :for="`${uid}-time`" class="field-label">Start time</label>
        <select :id="`${uid}-time`" v-model="form.time" required class="input-field">
          <option value="" disabled>Pick a time</option>
          <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
    </div>

    <div>
      <label :for="`${uid}-entry`" class="field-label">Entry fee</label>
      <select :id="`${uid}-entry`" v-model="form.entry" required class="input-field">
        <option value="" disabled>Pick a price</option>
        <option v-for="fee in entryFeeOptions" :key="fee.value" :value="fee.value">
          {{ fee.label }}
        </option>
      </select>
    </div>

    <div>
      <label :for="`${uid}-game`" class="field-label">
        Game <span class="font-normal text-gray-400">(optional)</span>
      </label>
      <select :id="`${uid}-game`" v-model="form.gameTypeId" class="input-field">
        <option value="">Not for one game</option>
        <option v-for="t in gameOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
        <option value="custom">Another game…</option>
      </select>
    </div>
    <div v-if="form.gameTypeId === 'custom'">
      <label :for="`${uid}-custom`" class="field-label">Which game?</label>
      <input
        :id="`${uid}-custom`"
        v-model="form.customGameType"
        type="text"
        required
        class="input-field"
        placeholder="e.g. Flesh and Blood"
      />
    </div>

    <div>
      <label :for="`${uid}-desc`" class="field-label">Details for players</label>
      <textarea
        :id="`${uid}-desc`"
        v-model="form.description"
        required
        rows="4"
        class="input-field resize-y"
        placeholder="Format, what's included, prizes…"
      ></textarea>
    </div>

    <label
      class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <span>
        <span class="block font-semibold text-gray-800">Show on the website</span>
        <span class="block text-sm text-gray-500">
          Turn off to save it as a draft that only admins can see.
        </span>
      </span>
      <input v-model="form.isVisible" type="checkbox" class="toggle" />
    </label>

    <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
      {{ error }}
    </p>

    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        v-if="cancelLabel"
        type="button"
        class="btn-secondary w-full px-5 py-3 sm:w-auto"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>
      <button type="submit" class="btn-primary w-full px-6 py-3 sm:w-auto" :disabled="saving">
        {{ saving ? 'Saving…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import type { SpecialEvent } from '../../stores/events'
import { useSquareCatalogStore } from '../../stores/squareCatalog'
import { eventDateToISO } from '../../utils/eventDateTime'

export type EventPayload = Omit<SpecialEvent, 'id'>

const props = defineProps<{
  // The event being edited; omit for a new one.
  event?: SpecialEvent | null
  submitLabel: string
  cancelLabel?: string
  saving?: boolean
}>()
const emit = defineEmits<{ submit: [payload: EventPayload]; cancel: [] }>()

const uid = useId()
const catalogStore = useSquareCatalogStore()
const error = ref('')

// Same game list the public Products page shows: Square's live top-level
// categories. A game with nothing in stock today won't be listed, so an event
// saved against one still shows its name via the fallback option below.
const gameOptions = computed(() => {
  const options = catalogStore.sections.map(s => ({ id: s.slug, name: s.name }))
  const current = props.event
  if (
    current?.gameTypeId &&
    current.gameTypeId !== 'custom' &&
    !options.some(o => o.id === current.gameTypeId)
  ) {
    options.push({ id: current.gameTypeId, name: current.gameTypeName || current.gameTypeId })
  }
  return options
})

const blank = () => ({
  title: '',
  dateISO: '',
  time: '',
  entry: '',
  description: '',
  gameTypeId: '',
  customGameType: '',
  isVisible: true,
})
const form = reactive(blank())

const load = (event: SpecialEvent | null | undefined) => {
  Object.assign(form, blank())
  error.value = ''
  if (!event) return
  form.title = event.title
  form.dateISO = eventDateToISO(event.date) ?? ''
  form.time = event.time
  form.entry = event.entry
  form.description = event.description
  form.isVisible = event.isVisible !== false
  form.gameTypeId = event.gameTypeId ?? ''
  form.customGameType = event.gameTypeId === 'custom' ? (event.gameTypeName ?? '') : ''
}
watch(() => props.event, load, { immediate: true })

// Half-hour steps across a whole day the shop might host something, plus
// whatever an older event already has saved, so editing never silently
// changes its time.
const timeOptions = computed(() => {
  const times: string[] = []
  for (let hour = 9; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) break
      const h = hour % 12 === 0 ? 12 : hour % 12
      times.push(`${h}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`)
    }
  }
  if (form.time && !times.includes(form.time)) times.unshift(form.time)
  return times
})

const entryFeeOptions = computed(() => {
  const fees = [{ label: 'Free', value: '0.00' }]
  for (let i = 5; i <= 100; i += 5) fees.push({ label: `$${i}`, value: i.toFixed(2) })
  if (form.entry && !fees.some(f => f.value === form.entry))
    fees.unshift({ label: `$${form.entry}`, value: form.entry })
  return fees
})

const readableDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const submit = () => {
  const custom = form.customGameType.trim()
  if (form.gameTypeId === 'custom' && !custom) {
    error.value = 'Type the name of the game, or pick one from the list.'
    return
  }
  error.value = ''
  // Empty strings (not undefined) so clearing the game on an edit is actually
  // saved — JSON drops undefined fields, which used to leave the old game set.
  const gameTypeName =
    form.gameTypeId === 'custom'
      ? custom
      : (gameOptions.value.find(o => o.id === form.gameTypeId)?.name ?? '')
  emit('submit', {
    title: form.title.trim(),
    date: readableDate(form.dateISO),
    time: form.time,
    entry: form.entry,
    description: form.description.trim(),
    gameTypeId: form.gameTypeId,
    gameTypeName,
    isVisible: form.isVisible,
  })
}

defineExpose({ reset: () => load(null), setError: (msg: string) => (error.value = msg) })
</script>

<style scoped>
.field-label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}
.input-field {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  font-size: 0.9375rem;
  line-height: 1.5rem;
}
.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px #16304a;
}
/* A plain on/off switch built on a real checkbox, so it stays keyboard- and
   screen-reader-friendly. */
.toggle {
  appearance: none;
  position: relative;
  flex-shrink: 0;
  width: 3.25rem;
  height: 1.75rem !important;
  min-height: 0 !important;
  border-radius: 9999px;
  background: #d1d5db;
  cursor: pointer;
  transition: background-color 0.15s;
}
.toggle::after {
  content: '';
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  transition: transform 0.15s;
}
.toggle:checked {
  background: #16304a;
}
.toggle:checked::after {
  transform: translateX(1.5rem);
}
.toggle:focus-visible {
  outline: 2px solid #d4af37;
  outline-offset: 2px;
}
</style>
