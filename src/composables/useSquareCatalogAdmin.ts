import { ref, computed, onScopeDispose } from 'vue'
import type { StockRow, CategoryGroup, SquareCategory } from '../components/admin/catalog/types'
import { squareAdminApi } from '../services/squareAdminApi'
export function useSquareCatalogAdmin() {
  const rows = ref<StockRow[]>([])
  const categories = ref<SquareCategory[]>([])
  const loading = ref(false)
  const fetchError = ref<string | null>(null)
  const search = ref('')

  const filteredRows = computed(() => {
    const term = search.value.trim().toLowerCase()
    if (!term) return rows.value
    return rows.value.filter(
      row =>
        row.displayName.toLowerCase().includes(term) || (row.sku || '').toLowerCase().includes(term)
    )
  })

  // Grouped by top-level Square category so a large catalog can be scanned and
  // edited section-by-section instead of one long flat table.
  const groupedFilteredRows = computed((): CategoryGroup[] => {
    const byName = new Map<string, CategoryGroup>()
    for (const row of filteredRows.value) {
      const name = row.categoryName || 'Uncategorized'
      let group = byName.get(name)
      if (!group) {
        group = { name, rows: [] }
        byName.set(name, group)
      }
      group.rows.push(row)
    }
    return [...byName.values()].sort((a, b) => {
      if (a.name === 'Uncategorized') return 1
      if (b.name === 'Uncategorized') return -1
      return a.name.localeCompare(b.name)
    })
  })

  const expandedCategories = ref(new Set<string>())
  const toggleCategory = (name: string) => {
    if (expandedCategories.value.has(name)) expandedCategories.value.delete(name)
    else expandedCategories.value.add(name)
  }

  let rowsController: AbortController | undefined
  let categoriesController: AbortController | undefined
  onScopeDispose(() => {
    rowsController?.abort()
    categoriesController?.abort()
  })
  const fetchRows = async () => {
    rowsController?.abort()
    const controller = new AbortController()
    rowsController = controller
    loading.value = true
    fetchError.value = null
    try {
      const data = await squareAdminApi.getCatalog(controller.signal)
      rows.value = data.items || []
    } catch (e) {
      if (controller.signal.aborted) return
      fetchError.value = e instanceof Error ? e.message : 'Failed to load catalog'
    } finally {
      if (controller === rowsController) loading.value = false
    }
  }

  const categoriesError = ref('')
  const fetchCategories = async () => {
    categoriesController?.abort()
    const controller = new AbortController()
    categoriesController = controller
    categoriesError.value = ''
    try {
      const data = await squareAdminApi.getCategories(controller.signal)
      categories.value = data.categories || []
    } catch (e) {
      if (controller.signal.aborted) return
      categoriesError.value = e instanceof Error ? e.message : 'Unable to load categories'
    }
  }

  return {
    rows,
    categories,
    loading,
    fetchError,
    categoriesError,
    search,
    filteredRows,
    groupedFilteredRows,
    expandedCategories,
    toggleCategory,
    fetchRows,
    fetchCategories,
  }
}
