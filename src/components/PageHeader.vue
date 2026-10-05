<template>
  <header class="page-shell pt-8 pb-5 sm:pt-12">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <h1 class="mt-2 font-display text-3xl font-bold tracking-tight text-outpost-navy sm:text-4xl">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="mt-2 max-w-2xl text-slate-600">{{ subtitle }}</p>
    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; eyebrow?: string; subtitle?: string }>()
</script>
