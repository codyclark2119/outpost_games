<template>
  <!-- Thumb-reach navigation for phones, where most visitors arrive. The
       footer pads its bottom by this bar's height so nothing hides under it. -->
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    aria-label="Main"
  >
    <ul class="grid grid-cols-4">
      <li v-for="link in PRIMARY_NAV" :key="link.name">
        <component
          :is="link.path ? RouterLink : 'a'"
          v-bind="link.path ? { to: link.path } : { href: `/#${link.sectionId}` }"
          class="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
          :class="
            isNavLinkActive(link, route.path)
              ? 'text-outpost-navy'
              : 'text-slate-500 active:text-outpost-navy'
          "
          :aria-current="isNavLinkActive(link, route.path) ? 'page' : undefined"
          @click="onTap(link, $event)"
        >
          <span
            v-if="isNavLinkActive(link, route.path)"
            class="absolute inset-x-6 top-0 h-0.5 rounded-full bg-outpost-gold"
            aria-hidden="true"
          ></span>
          <component :is="link.icon" class="h-6 w-6" aria-hidden="true" />
          {{ link.name }}
        </component>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { PRIMARY_NAV, isNavLinkActive, type NavLink } from '../config/navigation'
import { useSectionNav } from '../composables/useSectionNav'

const route = useRoute()
const { goToSection } = useSectionNav()

const onTap = (link: NavLink, event: MouseEvent) => {
  if (!link.sectionId) return
  event.preventDefault()
  goToSection(link.sectionId)
}
</script>
