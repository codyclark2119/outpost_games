<template>
  <section class="py-20 bg-gradient-to-br from-gray-50 to-gray-100 relative">
    <div class="container mx-auto px-4">
      <h2 class="font-cinzel text-4xl font-bold text-center mb-4 text-gray-800 section-heading">
        Games We Carry
      </h2>
      <p class="text-center text-gray-600 mb-12 text-lg max-w-2xl mx-auto">
        From long-time favorites to the newest releases — singles, sealed product, and a table to
        play at.
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        <router-link
          v-for="game in games"
          :key="game.id"
          to="/events"
          class="card text-center group"
        >
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-300 group-hover:scale-110"
            :style="{ backgroundColor: game.color }"
          >
            <Squares2X2Icon class="w-8 h-8 text-white" />
          </div>
          <h3 class="font-cinzel font-semibold text-gray-800">{{ game.name }}</h3>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Squares2X2Icon } from '@heroicons/vue/24/outline'

// Placeholder tiles — swap `imageUrl` in for each game's logo once official
// promotional assets are sourced (see README for the retailer asset links
// tracked down for Pokémon/One Piece/Gundam/Riftbound).
const games = [
  { id: 'magic', name: 'Magic: The Gathering', color: 'var(--color-game-magic)' },
  { id: 'pokemon', name: 'Pokémon', color: 'var(--color-game-pokemon)' },
  { id: 'onepiece', name: 'One Piece', color: 'var(--color-game-onepiece)' },
  { id: 'gundam', name: 'Gundam', color: 'var(--color-game-gundam)' },
  { id: 'riftbound', name: 'Riftbound', color: 'var(--color-game-riftbound)' },
]
</script>
