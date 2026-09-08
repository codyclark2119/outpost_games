import { ref } from 'vue'
import type { CategoryGroup } from '../components/admin/catalog/types'
export function useCatalogSelection(isLocked = () => false) {
  // ── Bulk selection & actions ──────────────────────────────────────────────────
  // This list is one row per VARIATION (from getSquareInventoryReport), so a
  // multi-variation item shows as multiple rows sharing one itemId — selection
  // is keyed by itemId, not row id, so checking any one variation-row selects
  // the whole item (every sibling row for that item reflects the same checked
  // state automatically, since they all share the same itemId key).
  const selectedItemIds = ref(new Set<string>())

  const toggleItemSelection = (itemId: string) => {
    if (isLocked()) return
    if (selectedItemIds.value.has(itemId)) selectedItemIds.value.delete(itemId)
    else selectedItemIds.value.add(itemId)
  }

  const clearSelection = () => {
    selectedItemIds.value.clear()
  }

  const groupSelectionState = (group: CategoryGroup): 'all' | 'some' | 'none' => {
    const itemIds = new Set(group.rows.map(row => row.itemId))
    const selectedCount = [...itemIds].filter(id => selectedItemIds.value.has(id)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === itemIds.size) return 'all'
    return 'some'
  }

  const toggleGroupSelection = (group: CategoryGroup) => {
    if (isLocked()) return
    const itemIds = [...new Set(group.rows.map(row => row.itemId))]
    const allSelected = groupSelectionState(group) === 'all'
    for (const id of itemIds) {
      if (allSelected) selectedItemIds.value.delete(id)
      else selectedItemIds.value.add(id)
    }
  }

  return {
    selectedItemIds,
    toggleItemSelection,
    clearSelection,
    groupSelectionState,
    toggleGroupSelection,
  }
}
