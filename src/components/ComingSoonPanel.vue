<template>
  <div class="card mx-auto max-w-xl text-center">
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-outpost-navy text-outpost-gold"
    >
      <ArchiveBoxIcon class="h-7 w-7" aria-hidden="true" />
    </div>
    <h2 class="mt-5 font-display text-xl font-bold text-outpost-navy">{{ title }}</h2>
    <p class="mx-auto mt-2 max-w-md text-slate-600">{{ message }}</p>
    <div class="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-600">
      <p class="font-semibold text-slate-800">Visit us</p>
      <p class="mt-1">{{ STORE_INFO.address.full }}</p>
      <p class="mt-1">
        <span v-for="(label, days) in STORE_INFO.hours" :key="days" class="block">
          {{ days }}: {{ label }}
        </span>
      </p>
    </div>
    <a
      :href="STORE_INFO.mapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="btn-primary mt-5 w-full sm:w-auto"
    >
      <MapPinIcon class="h-5 w-5" aria-hidden="true" />
      Get directions
    </a>
  </div>
</template>

<script setup lang="ts">
import { ArchiveBoxIcon, MapPinIcon } from '@heroicons/vue/24/outline'
import { STORE_INFO } from '../config/storeInfo'

withDefaults(
  defineProps<{
    title?: string
    message?: string
  }>(),
  {
    title: 'Nothing listed online right now',
    message:
      'Our online catalog mirrors what is on our shelves, and we are mid-restock. Stop by the shop to see the full selection in person.',
  }
)
</script>
