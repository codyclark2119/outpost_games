<template>
  <Dialog :open="open" class="relative z-[60]" @close="emit('close')">
    <div class="fixed inset-0 bg-black/60" aria-hidden="true" />
    <div class="fixed inset-0 overflow-y-auto p-4">
      <div class="flex min-h-full items-center justify-center">
        <DialogPanel class="catalog-dialog w-full max-w-3xl rounded-xl bg-white shadow-xl">
          <DialogTitle class="sr-only">{{ title }}</DialogTitle>
          <slot />
        </DialogPanel>
      </div>
    </div>
  </Dialog>
</template>
<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>
<style>
.catalog-dialog .input-field {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}
.catalog-dialog button,
.catalog-dialog input:not([type='checkbox']),
.catalog-dialog select {
  min-height: 2.75rem;
}
.catalog-dialog button,
.catalog-dialog input,
.catalog-dialog select {
  font-family: Arial, sans-serif;
}
.catalog-dialog :focus-visible {
  outline: 2px solid #16304a;
  outline-offset: 2px;
}
</style>
