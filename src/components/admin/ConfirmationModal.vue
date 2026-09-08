<template>
  <Dialog :open="state.open" class="relative z-[100]" @close="answer(false)">
    <div class="fixed inset-0 bg-black/60" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <DialogTitle class="text-lg font-semibold text-outpost-navy">Confirm change</DialogTitle>
        <DialogDescription class="my-4 text-gray-700">{{ state.message }}</DialogDescription>
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-secondary min-h-11 px-4" @click="answer(false)">
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-700 px-4 min-h-11 font-semibold text-white"
            @click="answer(true)"
          >
            Confirm
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, DialogDescription } from '@headlessui/vue'
import { useConfirmation } from '../../composables/useConfirmation'
const { state, answer } = useConfirmation()
</script>
