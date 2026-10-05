<template>
  <span class="inline-flex items-center gap-2">
    <span class="relative flex h-2.5 w-2.5" aria-hidden="true">
      <span
        v-if="status.isOpen"
        class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden"
      ></span>
      <span
        class="relative inline-flex h-2.5 w-2.5 rounded-full"
        :class="status.isOpen ? 'bg-emerald-400' : 'bg-slate-400'"
      ></span>
    </span>
    <span>
      <span class="font-semibold">{{ status.isOpen ? 'Open now' : 'Closed' }}</span>
      <span :class="compact ? 'hidden sm:inline' : ''"> · {{ status.detail }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { useStoreStatus } from '../composables/useStoreStatus'

defineProps<{ compact?: boolean }>()
const status = useStoreStatus()
</script>
