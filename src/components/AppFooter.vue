<template>
  <footer
    class="bg-outpost-navy-dark pb-[calc(5rem+env(safe-area-inset-bottom))] text-slate-300 md:pb-0"
  >
    <div class="page-shell grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
      <div>
        <router-link
          to="/"
          class="inline-flex items-center gap-3"
          aria-label="The Outpost Games home"
        >
          <img :src="badgeUrl" alt="" class="h-12 w-12" width="48" height="48" loading="lazy" />
          <span class="font-display text-lg font-bold text-white">The Outpost Games</span>
        </router-link>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          Rio Grande City's TCG shop — sealed product, singles, and weekly play.
        </p>
        <SocialLinks dark class="mt-5" />
      </div>

      <div>
        <h2 class="text-sm font-semibold text-white">Hours</h2>
        <dl class="mt-3 space-y-1.5 text-sm">
          <div v-for="(label, days) in STORE_INFO.hours" :key="days" class="flex gap-4">
            <dt class="w-20 text-slate-400">{{ days }}</dt>
            <dd>{{ label }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-white">Visit</h2>
        <address class="mt-3 space-y-2 text-sm not-italic">
          <a
            :href="STORE_INFO.mapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="block hover:text-white"
          >
            {{ STORE_INFO.address.line1 }}<br />
            {{ STORE_INFO.address.city }}, {{ STORE_INFO.address.state }}
            {{ STORE_INFO.address.zip }}
          </a>
          <a :href="`mailto:${STORE_INFO.email}`" class="block break-all hover:text-white">
            {{ STORE_INFO.email }}
          </a>
        </address>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="page-shell space-y-3 py-6 text-xs text-slate-400">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>&copy; {{ currentYear }} The Outpost Games</span>
          <router-link to="/terms" class="hover:text-white">Terms</router-link>
          <router-link to="/privacy" class="hover:text-white">Privacy</router-link>
        </div>
        <p class="max-w-3xl leading-relaxed text-slate-500">
          The Outpost Games is an independent retailer and is not affiliated with, endorsed, or
          sponsored by Wizards of the Coast, The Pokémon Company, Bandai Namco, or Riot Games.
          Magic: The Gathering, Pokémon, One Piece Card Game, Gundam Card Game, and Riftbound are
          trademarks of their respective owners.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import badgeUrl from '../assets/outpost-badge.webp'
import SocialLinks from './SocialLinks.vue'
import { STORE_INFO } from '../config/storeInfo'

const currentYear = new Date().getFullYear()
</script>
