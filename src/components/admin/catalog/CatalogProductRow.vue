<template>
  <tr
    class="border-b border-gray-100 last:border-0 hover:bg-gray-50"
    :class="{ 'bg-amber-50': selected }"
  >
    <td class="px-4 py-2.5">
      <input
        type="checkbox"
        :aria-label="`Select ${row.displayName}`"
        :checked="selected"
        @change="emit('select', row.itemId)"
      />
    </td>
    <td class="px-4 py-2.5 font-medium text-gray-800">{{ row.displayName }}</td>
    <td class="px-4 py-2.5 text-gray-500">{{ row.sku || '—' }}</td>
    <td class="px-4 py-2.5 text-right text-gray-700">
      {{ formatPrice(row.priceCents) }}
    </td>
    <td class="px-4 py-2.5 text-right text-gray-700">
      {{ row.quantity ?? '—' }}
    </td>
    <td class="px-4 py-2.5">
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold" :class="stockStatusClass(row)">
        {{ stockStatusLabel(row) }}
      </span>
    </td>
    <td class="px-4 py-2.5 text-right">
      <button class="text-outpost-navy font-semibold hover:underline" @click="emit('edit', row)">
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
