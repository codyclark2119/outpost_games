<template>
  <div class="border border-gray-200 rounded-lg p-3 space-y-2">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
        <input v-model="variation.name" type="text" class="input-field" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">SKU</label>
        <input
          :value="variation.sku"
          type="text"
          disabled
          class="input-field bg-gray-100 text-gray-400"
        />
      </div>
    </div>

    <!-- Each variation may override the group image; Square resolves the fallback. -->
    <ProductImageUploader
      v-model="variation.imageUrl"
      :item-id="itemId"
      :variation-id="variation.id"
      :label="variation.hasOwnImage ? 'Variation image' : 'Variation image (using group photo)'"
      @busy="variation.uploadingImage = $event"
      @uploaded="variation.hasOwnImage = true"
    />

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Price ($)</label>
        <input
          v-model.number="variation.price"
          type="number"
          step="0.01"
          min="0"
          class="input-field"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1"
          >Unit Cost ($)
          <span class="text-gray-400 font-normal">— for profit tracking</span>
        </label>
        <input
          v-model="variation.cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="Not set"
          class="input-field"
        />
      </div>
    </div>

    <p v-if="marginLabel(variation)" class="text-xs text-gray-500">
      {{ marginLabel(variation) }}
    </p>

    <div class="flex gap-6 items-center">
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="variation.trackInventory" type="checkbox" />
        Track inventory
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="variation.sellable" type="checkbox" />
        Sellable
      </label>
    </div>

    <!-- Inventory correction -->
    <div
      v-if="variation.trackInventory && variation.quantity !== null"
      class="bg-gray-50 rounded-lg p-2"
    >
      <label class="block text-xs font-medium text-gray-500 mb-1">
        Correct On-Hand Count
        <span class="text-gray-400 font-normal">(currently {{ variation.quantity }})</span>
      </label>
      <div class="flex gap-2">
        <input
          v-model.number="variation.correctedQuantity"
          type="number"
          min="0"
          step="1"
          class="input-field"
        />
        <button
          type="button"
          class="btn-secondary px-3 text-sm whitespace-nowrap"
          :disabled="variation.correctingCount"
          @click="emit('correctInventory', variation)"
        >
          {{ variation.correctingCount ? 'Setting…' : 'Set Count' }}
        </button>
      </div>
      <span v-if="variation.inventoryError" class="text-red-600 text-xs block mt-1">{{
        variation.inventoryError
      }}</span>
      <span v-if="variation.inventorySuccess" class="text-green-600 text-xs block mt-1"
        >Count updated.</span
      >
    </div>

    <!-- Per-variation delete -->
    <div class="flex justify-end pt-1">
      <template v-if="!variation.deleteConfirming">
        <button
          type="button"
          class="text-red-600 text-xs font-semibold hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
          :disabled="variationCount <= 1"
          :title="
            variationCount <= 1
              ? 'Delete the whole item instead — it must keep at least one variation'
              : ''
          "
          @click="variation.deleteConfirming = true"
        >
          Delete Variation
        </button>
      </template>
      <template v-else>
        <span class="text-xs text-gray-600 flex items-center gap-2">
          Delete this variation permanently?
          <button
            type="button"
            class="text-gray-500 hover:underline"
            @click="variation.deleteConfirming = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="text-red-600 font-semibold hover:underline"
            :disabled="variation.deleting"
            @click="emit('deleteVariation', variation)"
          >
            {{ variation.deleting ? 'Deleting…' : 'Confirm' }}
          </button>
        </span>
      </template>
    </div>
    <span v-if="variation.deleteError" class="text-red-600 text-xs block">{{
      variation.deleteError
    }}</span>
  </div>
</template>
<script setup lang="ts">
import ProductImageUploader from './ProductImageUploader.vue'
import type { VariationForm } from './types'
const variation = defineModel<VariationForm>({ required: true })
defineProps<{ variationCount: number; itemId: string }>()
const emit = defineEmits<{
  correctInventory: [variation: VariationForm]
  deleteVariation: [variation: VariationForm]
}>()
// Live margin preview while editing — blank until both price and cost are
// filled in, so an admin isn't shown a misleading 100% margin before they've
// entered a real cost.
const marginLabel = (variation: VariationForm) => {
  const cost = parseFloat(variation.cost)
  if (variation.cost.trim() === '' || Number.isNaN(cost) || !variation.price) return ''
  const profit = variation.price - cost
  const marginPct = (profit / variation.price) * 100
  return `Margin: $${profit.toFixed(2)} (${marginPct.toFixed(0)}%) per unit`
}
</script>
