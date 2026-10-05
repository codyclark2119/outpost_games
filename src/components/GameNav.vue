<template>
  <!-- Sticky, swipeable game switcher shared by /products and /products/:typeId -->
  <nav
    class="sticky top-16 z-30 border-b border-slate-200/80 bg-outpost-paper/95 backdrop-blur-md"
    aria-label="Games"
  >
    <div class="page-shell">
      <!-- Swipe on touch screens; wrap on desktop, where a mouse can't easily
           scroll sideways -->
      <div class="scroll-row py-3 lg:mx-0 lg:flex-wrap lg:px-0">
        <router-link
          to="/products"
          class="chip snap-start"
          :class="{ 'chip-active': !activeSlug }"
          :aria-current="!activeSlug ? 'page' : undefined"
        >
          All games
        </router-link>
        <router-link
          v-for="section in sections"
          :key="section.slug"
          :to="`/products/${section.slug}`"
          class="chip snap-start"
          :class="{ 'chip-active': section.slug === activeSlug }"
          :aria-current="section.slug === activeSlug ? 'page' : undefined"
        >
          <span
            class="h-2 w-2 rounded-full"
            :style="{ backgroundColor: gameMeta(section.slug, section.name).accent }"
            aria-hidden="true"
          ></span>
          {{ gameMeta(section.slug, section.name).label }}
          <span class="text-xs opacity-60">{{ section.items.length }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { CatalogSection } from '../stores/squareCatalog'
import { gameMeta } from '../config/games'

defineProps<{ sections: CatalogSection[]; activeSlug?: string | null }>()
</script>
