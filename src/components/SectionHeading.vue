<template>
  <div class="flex items-end justify-between gap-4">
    <div>
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h2 class="section-title mt-1.5">{{ title }}</h2>
    </div>
    <router-link v-if="to" :to="to" class="text-link shrink-0">
      {{ linkLabel }}
      <ArrowRightIcon class="h-4 w-4" aria-hidden="true" />
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

defineProps<{ title: string; eyebrow?: string; to?: string; linkLabel?: string }>()
</script>
