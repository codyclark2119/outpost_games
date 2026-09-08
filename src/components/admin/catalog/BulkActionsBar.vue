<template>
  <!-- Sticky bulk-action bar -->
  <transition name="fade">
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 z-20"
    >
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <p class="text-sm text-gray-600">{{ selectedCount }} item(s) selected</p>
          <div class="flex flex-wrap gap-3 items-center">
            <select
              class="input-field !w-auto text-sm"
              :disabled="running"
              @change="emit('onBulkCategoryChange', $event)"
            >
              <option value="">Move to Category…</option>
              <option value="__none__">Uncategorized</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.path || cat.name }}
              </option>
            </select>
            <select
              class="input-field !w-auto text-sm"
              :disabled="running"
              @change="emit('onBulkVisibilityChange', $event)"
            >
              <option value="">Toggle Visibility…</option>
              <option value="false">Visible</option>
              <option value="true">Hidden</option>
            </select>
            <select
              class="input-field !w-auto text-sm"
              :disabled="running"
              @change="emit('onBulkSellableChange', $event)"
            >
              <option value="">Toggle Sellable…</option>
              <option value="true">Sellable</option>
              <option value="false">Not Sellable</option>
            </select>
            <div class="flex items-center gap-1.5">
              <input
                v-model="bulkReleasedAt"
                type="date"
                class="input-field !w-auto text-sm"
                :disabled="running"
              />
              <button
                type="button"
                class="btn-secondary px-3 py-1.5 text-sm whitespace-nowrap"
                :disabled="!bulkReleasedAt || running"
                @click="emit('releasedAt')"
              >
                Set Released Date
              </button>
            </div>
            <button
              type="button"
              class="text-red-600 text-sm font-semibold hover:underline"
              :disabled="running"
              @click="emit('delete')"
            >
              Delete Selected
            </button>
            <button
              type="button"
              class="text-gray-500 text-sm hover:underline"
              :disabled="running"
              @click="emit('clear')"
            >
              Clear
            </button>
          </div>
        </div>
        <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
      </div>
    </div>
  </transition>
</template>
<script setup lang="ts">
import type { SquareCategory } from './types'
defineProps<{
  selectedCount: number
  categories: SquareCategory[]
  running: boolean
  error: string
}>()
const bulkReleasedAt = defineModel<string>({ required: true })
const emit = defineEmits<{
  onBulkCategoryChange: [event: Event]
  onBulkVisibilityChange: [event: Event]
  onBulkSellableChange: [event: Event]
  releasedAt: []
  delete: []
  clear: []
}>()
</script>
