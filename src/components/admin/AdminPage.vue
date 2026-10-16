<template>
  <!-- Shared frame for every admin screen: a short back link, a plain-language
       title, and the page body at a width that suits it. Keeping it in one
       place means every screen reads the same way on a phone. -->
  <div class="min-h-full bg-gray-50 pt-4 sm:pt-8" :class="bottomBar ? 'pb-36' : 'pb-8'">
    <div class="mx-auto px-4" :class="WIDTHS[width]">
      <router-link
        v-if="back !== false"
        :to="back.to"
        class="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm font-semibold text-outpost-navy hover:underline"
      >
        <ChevronLeftIcon class="h-4 w-4" aria-hidden="true" />
        {{ back.label }}
      </router-link>
      <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <h1 class="font-display text-2xl leading-tight font-bold text-gray-800 sm:text-3xl">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="mt-1 text-sm text-gray-600 sm:text-base">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="flex w-full flex-wrap gap-2 sm:w-auto">
          <slot name="actions" />
        </div>
      </header>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import type { RouteLocationRaw } from 'vue-router'

const WIDTHS = {
  narrow: 'max-w-xl',
  medium: 'max-w-4xl',
  wide: 'max-w-6xl',
} as const

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    width?: keyof typeof WIDTHS
    // Where "back" goes. Defaults to the admin home; false hides it.
    back?: { to: RouteLocationRaw; label: string } | false
    // Leaves room for a save/bulk-action bar pinned to the bottom of the screen.
    bottomBar?: boolean
  }>(),
  {
    subtitle: undefined,
    width: 'medium',
    back: () => ({ to: { name: 'AdminDashboard' }, label: 'Admin home' }),
  }
)
</script>
