import type { Component } from 'vue'
import { HomeIcon, ShoppingBagIcon, CalendarDaysIcon, MapPinIcon } from '@heroicons/vue/24/outline'

// The public site's primary navigation — the desktop header and the mobile
// bottom tab bar render this same list so the two can never drift apart.
// A link has either a route `path` or a `sectionId` on the one-page Home
// (navigated via useSectionNav, never a bare anchor).
export interface NavLink {
  name: string
  path?: string
  sectionId?: string
  icon: Component
}

export const PRIMARY_NAV: NavLink[] = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Products', path: '/products', icon: ShoppingBagIcon },
  { name: 'Events', path: '/events', icon: CalendarDaysIcon },
  { name: 'Visit', sectionId: 'contact', icon: MapPinIcon },
]

export const isNavLinkActive = (link: NavLink, currentPath: string) =>
  link.path === '/'
    ? currentPath === '/'
    : Boolean(link.path) && (currentPath === link.path || currentPath.startsWith(`${link.path}/`))
