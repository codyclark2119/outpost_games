<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="font-cinzel text-4xl font-bold text-center mb-12 text-gray-800">Admin Dashboard</h1>

        <!-- Events -->
        <div class="mb-10">
          <h2 class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1">Events</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link to="/x/outpostAdmin/events" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Events</h3>
                <p class="text-gray-500 text-sm">Edit and delete tournament events</p>
              </div>
            </router-link>

            <router-link to="/x/outpostAdmin/events/add" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Event</h3>
                <p class="text-gray-500 text-sm">Create a new tournament or special event</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Products -->
        <div class="mb-10">
          <h2 class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1">Products</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link to="/x/outpostAdmin/products" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-outpost-navy rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-outpost-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Products</h3>
                <p class="text-gray-500 text-sm">Edit visibility, prices, and descriptions</p>
              </div>
            </router-link>

            <router-link to="/x/outpostAdmin/products/add" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-outpost-gold rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-outpost-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Products</h3>
                <p class="text-gray-500 text-sm">Add new game types, sets, or products</p>
              </div>
            </router-link>
          </div>
        </div>

        <!-- Single Card Listings -->
        <div class="mb-10">
          <h2 class="font-cinzel text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 pl-1">Single Card Listings</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <router-link to="/x/outpostAdmin/tcgplayer" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Manage Listings</h3>
                <p class="text-gray-500 text-sm">Edit and delete featured single cards</p>
              </div>
            </router-link>

            <router-link to="/x/outpostAdmin/tcgplayer/add" class="card-mtg hover:shadow-xl transition-all duration-300">
              <div class="text-center">
                <div class="w-14 h-14 bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 class="font-cinzel font-semibold text-lg mb-1">Add Listing</h3>
                <p class="text-gray-500 text-sm">Add a new single card to the listings</p>
              </div>
            </router-link>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Admin Dashboard
</script>
