<template>
  <div
    class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
    role="status"
    aria-label="Loading products"
  >
    <div v-for="n in count" :key="n" class="overflow-hidden rounded-2xl border border-slate-200">
      <div class="aspect-square animate-pulse bg-slate-100"></div>
      <div class="space-y-2 p-3">
        <div class="h-3 w-3/4 animate-pulse rounded bg-slate-100"></div>
        <div class="h-4 w-1/3 animate-pulse rounded bg-slate-100"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 10 })
</script>
