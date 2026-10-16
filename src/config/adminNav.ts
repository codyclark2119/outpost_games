import type { Component } from 'vue'
import {
  HomeIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  TagIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  TableCellsIcon,
  RectangleStackIcon,
} from '@heroicons/vue/24/outline'

// Every admin screen, named for the job it does rather than the system behind
// it — the people running the shop think "count the stock", not "Square
// inventory batch". Titles here are also each screen's page heading, so the
// tile someone taps and the page they land on always say the same thing.
export interface AdminTask {
  routeName: string
  title: string
  hint: string
  icon: Component
}

export interface AdminTaskGroup {
  heading: string
  tasks: AdminTask[]
}

export const ADMIN_TASKS = {
  scan: {
    routeName: 'AdminSquareScan',
    title: 'Scan a barcode',
    hint: 'Check or fix the count for one product',
    icon: QrCodeIcon,
  },
  addEvent: {
    routeName: 'AdminEventsAdd',
    title: 'Add an event',
    hint: 'Tournaments, prereleases, one-off nights',
    icon: PlusCircleIcon,
  },
  events: {
    routeName: 'AdminEvents',
    title: 'Change or remove events',
    hint: 'Edit details, hide, or delete',
    icon: PencilSquareIcon,
  },
  weekly: {
    routeName: 'AdminWeeklySchedule',
    title: 'Skip a weekly night',
    hint: 'Cancel one week of a regular event',
    icon: NoSymbolIcon,
  },
  restock: {
    routeName: 'AdminSquareRestock',
    title: 'Open a box into packs',
    hint: 'Move a sealed box into loose packs',
    icon: ArchiveBoxIcon,
  },
  count: {
    routeName: 'AdminSquareMassInventory',
    title: 'Count lots of stock',
    hint: 'Fix many counts at once, or recount',
    icon: ClipboardDocumentListIcon,
  },
  catalog: {
    routeName: 'AdminSquareCatalog',
    title: 'Products & photos',
    hint: 'Names, prices, photos, what shows online',
    icon: TagIcon,
  },
  stock: {
    routeName: 'AdminSquareStock',
    title: 'Stock list',
    hint: "See what's in and out of stock",
    icon: TableCellsIcon,
  },
  sales: {
    routeName: 'AdminSquareSales',
    title: 'Sales',
    hint: 'How the shop is selling over time',
    icon: ChartBarIcon,
  },
  singles: {
    routeName: 'AdminTCGPlayer',
    title: 'Featured singles',
    hint: 'Single cards linked to TCGplayer',
    icon: RectangleStackIcon,
  },
  addSingle: {
    routeName: 'AdminTCGPlayerAdd',
    title: 'Add a featured single',
    hint: 'Link a new card from TCGplayer',
    icon: PlusCircleIcon,
  },
} satisfies Record<string, AdminTask>

export const ADMIN_TASK_GROUPS: AdminTaskGroup[] = [
  {
    heading: 'Events',
    tasks: [ADMIN_TASKS.addEvent, ADMIN_TASKS.events, ADMIN_TASKS.weekly],
  },
  {
    heading: 'Stock',
    tasks: [ADMIN_TASKS.scan, ADMIN_TASKS.restock, ADMIN_TASKS.count, ADMIN_TASKS.stock],
  },
  {
    heading: 'Products',
    tasks: [ADMIN_TASKS.catalog, ADMIN_TASKS.sales],
  },
  {
    heading: 'Single cards',
    tasks: [ADMIN_TASKS.singles, ADMIN_TASKS.addSingle],
  },
]

// The admin tab bar (phones) and header links (desktop). Each tab also counts
// as "active" on the related screens listed in `alsoActiveOn`, so the bar
// still shows where you are after drilling into a sub-page.
export interface AdminTab {
  label: string
  routeName: string
  icon: Component
  alsoActiveOn?: string[]
}

export const ADMIN_TABS: AdminTab[] = [
  { label: 'Home', routeName: 'AdminDashboard', icon: HomeIcon },
  { label: 'Scan', routeName: 'AdminSquareScan', icon: QrCodeIcon },
  {
    label: 'Events',
    routeName: 'AdminEvents',
    icon: CalendarDaysIcon,
    alsoActiveOn: ['AdminEventsAdd', 'AdminWeeklySchedule'],
  },
  {
    label: 'Products',
    routeName: 'AdminSquareCatalog',
    icon: TagIcon,
    alsoActiveOn: [
      'AdminSquareStock',
      'AdminSquareMassInventory',
      'AdminSquareRestock',
      'AdminSquareSales',
    ],
  },
]
