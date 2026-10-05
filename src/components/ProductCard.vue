<template>
  <!-- No fixed height: as a flex/grid item it stretches to its row, so every
       card in a row lines up regardless of title length. -->
  <article class="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div class="relative aspect-square bg-white">
      <img
        v-if="item.imageUrl"
        :src="item.imageUrl"
        :alt="item.name"
        class="absolute inset-0 h-full w-full object-contain p-3"
        loading="lazy"
        decoding="async"
      />
      <!-- No photo in Square yet: the set's symbol (or the shop logo) on a tile
           tinted with the game's accent, so it reads as intentional. -->
      <div
        v-else
        class="flex h-full items-center justify-center"
        :style="{ backgroundColor: `color-mix(in srgb, ${game.accent} 12%, white)` }"
      >
        <img
          :src="placeholder.url"
          alt=""
          class="object-contain"
          :class="placeholder.kind === 'set' ? 'h-1/2 w-1/2' : 'h-3/5 w-3/5'"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
    <div class="flex flex-1 flex-col gap-1 border-t border-slate-100 p-3">
      <p
        v-if="subtitle"
        class="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
      >
        {{ subtitle }}
      </p>
      <h3 class="line-clamp-2 text-sm leading-snug font-medium text-slate-800">
        {{ item.name }}
      </h3>
      <p class="mt-auto pt-1 text-base font-semibold text-outpost-navy">
        {{ formatPrice(item) }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatPrice, slugify, type SquarePublicItem } from '../stores/squareCatalog'
import { gameMeta } from '../config/games'
import { placeholderArt } from '../config/setSymbols'

// subtitle: the set or game name shown above the title, when the context
// around the card doesn't already make it obvious.
const props = defineProps<{ item: SquarePublicItem; subtitle?: string | null }>()
const game = computed(() => gameMeta(slugify(props.item.categoryName), props.item.categoryName))
const placeholder = computed(() => placeholderArt(props.item.setName, props.item.name))
</script>
