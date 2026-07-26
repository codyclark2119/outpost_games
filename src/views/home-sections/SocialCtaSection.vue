<template>
  <section id="community" class="py-20 bg-outpost-navy relative overflow-hidden scroll-mt-24">
    <div
      class="absolute inset-0 bg-gradient-to-br from-outpost-gold/10 via-transparent to-transparent opacity-50"
    ></div>
    <div class="container mx-auto px-4 relative z-10">
      <h2
        class="font-cinzel text-3xl md:text-4xl font-bold text-white text-center mb-4 section-heading"
      >
        Join the Community
      </h2>
      <p class="text-gray-300 text-lg text-center mb-12 max-w-2xl mx-auto leading-relaxed">
        Trade lists, deck checks, pull celebrations, event sign-ups, and restock alerts — follow
        along wherever you already hang out.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <!-- Discord -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div
            class="w-16 h-16 bg-outpost-gold rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
          >
            <svg class="w-8 h-8 text-outpost-black" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
              />
            </svg>
          </div>
          <h3 class="font-cinzel text-xl font-bold text-white mb-2">Our Discord</h3>
          <p class="text-gray-300 text-sm mb-6 leading-relaxed">
            Magic, Pokémon, One Piece, Gundam, and Riftbound all have a home there. Come say hi.
          </p>
          <a
            :href="STORE_INFO.social.discord"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary inline-flex items-center gap-2 px-8 py-3"
          >
            Join the Discord
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>

        <!-- Instagram -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg instagram-badge"
          >
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.44.645-1.44 1.44s.644 1.44 1.44 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
              />
            </svg>
          </div>
          <h3 class="font-cinzel text-xl font-bold text-white mb-2">Follow on Instagram</h3>
          <p class="text-gray-300 text-sm mb-6 leading-relaxed">
            New arrivals, event photos, and behind-the-scenes shop life.
          </p>
          <a
            :href="STORE_INFO.social.instagram"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-secondary inline-flex items-center gap-2 px-8 py-3 !border-white/30 !text-white hover:!border-outpost-gold hover:!text-outpost-gold"
          >
            Follow Along
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { STORE_INFO } from '../../config/storeInfo'
</script>

<style scoped>
.instagram-badge {
  background: radial-gradient(
    circle at 30% 107%,
    #fdf497 0%,
    #fdf497 5%,
    #fd5949 45%,
    #d6249f 60%,
    #285aeb 90%
  );
}
</style>
