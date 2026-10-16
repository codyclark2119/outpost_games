<template>
  <tr
    class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
    :class="{ 'bg-amber-50': selected }"
  >
    <td class="py-2.5 pr-1 pl-3 sm:px-4">
      <input
        type="checkbox"
        :aria-label="`Select ${row.displayName}`"
        :checked="selected"
        @change="emit('select', row.itemId)"
      />
    </td>
    <td class="px-2 py-2.5 sm:px-4">
      <!-- Tapping the name opens the editor too: on a phone it's the biggest target. -->
      <button
        type="button"
        class="min-h-0 text-left font-medium text-gray-800 hover:underline"
        @click="emit('edit', row)"
      >
        {{ row.displayName }}
      </button>
      <span class="block text-xs text-gray-500 sm:hidden">
        {{ formatPrice(row.priceCents) }}<template v-if="row.sku"> · SKU {{ row.sku }}</template>
      </span>
    </td>
    <td class="hidden px-4 py-2.5 text-gray-500 sm:table-cell">{{ row.sku || '—' }}</td>
    <td class="hidden px-4 py-2.5 text-right text-gray-700 sm:table-cell">
      {{ formatPrice(row.priceCents) }}
    </td>
    <td
      class="px-2 py-2.5 text-right sm:px-4"
      :class="row.trackInventory && !row.inStock ? 'font-semibold text-red-700' : 'text-gray-700'"
    >
      {{ row.quantity ?? '—' }}
    </td>
    <td class="hidden px-4 py-2.5 md:table-cell">
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold" :class="stockStatusClass(row)">
        {{ stockStatusLabel(row) }}
      </span>
    </td>
    <td class="py-2.5 pr-3 pl-1 text-right sm:px-4">
      <button
        class="px-2 text-outpost-navy font-semibold hover:underline"
        @click="emit('edit', row)"
      >
        Edit
      </button>
    </td>
  </tr>
</template>
<script setup lang="ts">
import type { StockRow } from './types'
defineProps<{ row: StockRow; selected: boolean }>()
const emit = defineEmits<{ select: [id: string]; edit: [row: StockRow] }>()
const formatPrice = (cents: number | null) => (cents == null ? '—' : `$${(cents / 100).toFixed(2)}`)

// Same status convention as AdminSquareStock.vue's read-only report, so the
// two pages read consistently.
const stockStatusLabel = (row: StockRow) => {
  if (!row.trackInventory) return 'Not Tracked'
  return row.inStock ? 'In Stock' : 'Out of Stock'
}

const stockStatusClass = (row: StockRow) => {
  if (!row.trackInventory) return 'bg-gray-100 text-gray-500'
  return row.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}
</script>
