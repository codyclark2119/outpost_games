<template>
  <header
    class="sticky top-0 z-40 border-b border-white/10 bg-outpost-navy-dark/95 text-white backdrop-blur-md"
  >
    <div class="page-shell flex h-16 items-center justify-between gap-4">
      <router-link to="/" class="shrink-0" aria-label="The Outpost Games home">
        <img
          :src="wordmarkUrl"
          alt="The Outpost Games"
          class="h-9 w-auto"
          width="101"
          height="36"
          fetchpriority="high"
        />
      </router-link>

      <!-- Desktop navigation; phones get MobileTabBar instead -->
      <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
        <template v-for="link in PRIMARY_NAV" :key="link.name">
          <router-link
            v-if="link.path"
            :to="link.path"
            class="rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            :class="
              isNavLinkActive(link, route.path)
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:text-white'
            "
            :aria-current="isNavLinkActive(link, route.path) ? 'page' : undefined"
          >
            {{ link.name }}
          </router-link>
          <a
            v-else
            :href="`/#${link.sectionId}`"
            class="rounded-lg px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
            @click.prevent="goToSection(link.sectionId)"
          >
            {{ link.name }}
          </a>
        </template>
      </nav>

      <div class="flex items-center gap-3">
        <a
          href="/#contact"
          class="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90 transition-colors hover:bg-white/15"
          @click.prevent="goToSection('contact')"
        >
          <StoreStatus compact />
        </a>
        <a
          :href="STORE_INFO.mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary hidden py-2 text-sm lg:inline-flex"
        >
          <MapPinIcon class="h-4 w-4" />
          Directions
        </a>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { MapPinIcon } from '@heroicons/vue/24/outline'
import wordmarkUrl from '../assets/outpost_text_only.png'
import StoreStatus from './StoreStatus.vue'
import { PRIMARY_NAV, isNavLinkActive } from '../config/navigation'
import { STORE_INFO } from '../config/storeInfo'
import { useSectionNav } from '../composables/useSectionNav'

const route = useRoute()
const { goToSection } = useSectionNav()
</script>
