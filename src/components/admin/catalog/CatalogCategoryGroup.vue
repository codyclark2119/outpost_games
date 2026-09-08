<template>
  <div class="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
    <div class="flex items-center gap-3 px-4 py-3 bg-outpost-navy text-white select-none">
      <input
        type="checkbox"
        :aria-label="`Select all ${group.name} items`"
        class="accent-outpost-gold"
        :checked="selectionState === 'all'"
        :indeterminate.prop="selectionState === 'some'"
        @click.stop="emit('select-group', group)"
      />
      <button
        type="button"
        :aria-expanded="expanded"
        class="flex items-center gap-3 flex-1 text-left min-h-11"
        @click="emit('toggle', group.name)"
      >
        <span class="text-lg transition-transform duration-200" :class="expanded ? 'rotate-90' : ''"
          >▶</span
        >
        <span class="font-cinzel font-bold text-lg flex-1">{{ group.name }}</span>
        <span class="text-xs text-white/60"
          >{{ group.rows.length }} item{{ group.rows.length !== 1 ? 's' : '' }}</span
        >
      </button>
    </div>

    <div v-if="expanded" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr
            class="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500"
          >
            <th class="px-4 py-3 w-8"></th>
            <th class="px-4 py-3">Item</th>
            <th class="px-4 py-3">SKU</th>
            <th class="px-4 py-3 text-right">Price</th>
            <th class="px-4 py-3 text-right">Qty</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <CatalogProductRow
            v-for="row in group.rows"
            :key="row.id"
            :row="row"
            :selected="selectedItemIds.has(row.itemId)"
            @select="emit('select', $event)"
            @edit="emit('edit', $event)"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
import CatalogProductRow from './CatalogProductRow.vue'
import type { CategoryGroup, StockRow } from './types'
defineProps<{
  group: CategoryGroup
  selectionState: 'all' | 'some' | 'none'
  expanded: boolean
  selectedItemIds: Set<string>
}>()
const emit = defineEmits<{
  'select-group': [group: CategoryGroup]
  toggle: [name: string]
  select: [id: string]
  edit: [row: StockRow]
}>()
</script>
