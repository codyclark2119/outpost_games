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
      <!-- Always two lines tall, so prices line up across a row. -->
      <h3 class="line-clamp-2 min-h-[2.75em] text-sm leading-snug font-medium text-slate-800">
        {{ item.name }}
      </h3>
      <p class="pt-1 text-base font-semibold text-outpost-navy">
        {{ formatPrice(item) }}
      </p>
      <div v-if="canBuy" class="mt-auto pt-2">
        <button type="button" class="btn-primary w-full py-2.5 text-sm" @click="buying = true">
          <ShoppingBagIcon class="h-4 w-4" aria-hidden="true" />
          Buy online
        </button>
        <BuyOnlineDialog v-if="buying" :item="item" :open="buying" @close="buying = false" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { ShoppingBagIcon } from '@heroicons/vue/24/outline'
import { formatPrice, slugify, type SquarePublicItem } from '../stores/squareCatalog'
import { gameMeta } from '../config/games'
import { placeholderArt } from '../config/setSymbols'

// Loaded on the first tap of "Buy online", not with every product grid.
const BuyOnlineDialog = defineAsyncComponent(() => import('./BuyOnlineDialog.vue'))

// subtitle: the set or game name shown above the title, when the context
// around the card doesn't already make it obvious.
// buyable: show "Buy online" for items that can be bought online. Off where
// the whole card is already a link (Home's new arrivals), since a button
// can't sit inside a link.
const props = defineProps<{
  item: SquarePublicItem
  subtitle?: string | null
  buyable?: boolean
}>()
const canBuy = computed(
  () => props.buyable && (props.item.priceCents ?? 0) > 0 && (props.item.onlineQuantity ?? 0) > 0
)
const buying = ref(false)
const game = computed(() => gameMeta(slugify(props.item.categoryName), props.item.categoryName))
const placeholder = computed(() => placeholderArt(props.item.setName, props.item.name))
</script>
