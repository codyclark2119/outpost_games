<template>
  <!-- "Add to calendar" and "Share" for one special event. Laid out as two
       buttons side by side on a phone, the calendar one taking the spare width
       so its label stays on one line. -->
  <div class="grid grid-cols-[1fr_auto] gap-3 sm:flex sm:flex-wrap">
    <Menu as="div" class="relative">
      <MenuButton :class="[buttonClass, 'w-full']">
        <CalendarDaysIcon class="h-5 w-5" aria-hidden="true" />
        Add to calendar
      </MenuButton>
      <!-- Opens upward: on a phone the button often sits just above the fixed
           tab bar, which would otherwise cover the list. -->
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="scale-95 opacity-0"
        leave-active-class="transition duration-75 ease-in"
        leave-to-class="scale-95 opacity-0"
      >
        <MenuItems
          class="absolute bottom-full left-0 z-20 mb-2 w-full min-w-56 origin-bottom-left overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-lg focus:outline-none"
        >
          <MenuItem v-slot="{ active }">
            <a
              :href="eventCalendarFileUrl(event.id)"
              class="flex min-h-11 items-center px-4 text-sm font-medium"
              :class="active ? 'bg-slate-100' : ''"
            >
              Apple or Outlook calendar
            </a>
          </MenuItem>
          <MenuItem v-if="googleUrl" v-slot="{ active }">
            <a
              :href="googleUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex min-h-11 items-center px-4 text-sm font-medium"
              :class="active ? 'bg-slate-100' : ''"
            >
              Google Calendar
            </a>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>

    <button type="button" :class="buttonClass" @click="share">
      <component :is="copied ? CheckIcon : ShareIcon" class="h-5 w-5" aria-hidden="true" />
      {{ copied ? 'Link copied' : 'Share' }}
    </button>
    <span class="sr-only" aria-live="polite">{{ copied ? 'Event link copied' : '' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { CalendarDaysIcon, ShareIcon, CheckIcon } from '@heroicons/vue/24/outline'
import type { SpecialEvent } from '../stores/events'
import { eventCalendarFileUrl, eventShareUrl, googleCalendarUrl } from '../utils/eventLinks'

const props = withDefaults(defineProps<{ event: SpecialEvent; onDark?: boolean }>(), {
  onDark: false,
})

const buttonClass = computed(() =>
  props.onDark ? 'btn-on-dark py-3 whitespace-nowrap' : 'btn-secondary py-3 whitespace-nowrap'
)
const googleUrl = computed(() => googleCalendarUrl(props.event))

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

// Phones get their own share sheet (Messages, Discord, Facebook…); anywhere
// without one, the link is copied instead.
const share = async () => {
  const url = eventShareUrl(props.event.id)
  if (navigator.share) {
    try {
      await navigator.share({ title: props.event.title, url })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2500)
  } catch {
    window.prompt('Copy this link to share the event:', url)
  }
}
</script>
