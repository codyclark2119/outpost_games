<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="font-cinzel text-4xl font-bold text-center mb-12 text-gray-800">
          Shopping Cart
        </h1>
        <div v-if="cartStore.itemCount === 0" class="card-mtg">
          <div class="text-center py-12">
            <h2 class="font-cinzel text-2xl font-bold mb-4 text-gray-800">Your cart is empty</h2>
            <p class="text-gray-600 mb-6">Add some cards to your cart to get started!</p>
            <router-link to="/shop" class="btn-primary px-8 py-4"> Continue Shopping </router-link>
          </div>
        </div>
        <div v-else>
          <div class="space-y-4 mb-8">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="card-mtg flex items-center justify-between"
            >
              <div>
                <h3 class="font-semibold">{{ item.name }}</h3>
                <p class="text-gray-600 text-sm">{{ item.set }}</p>
                <p class="font-bold">${{ item.price.toFixed(2) }} each</p>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-800">Qty: {{ item.quantity }}</span>
                <button
                  class="text-red-500 hover:text-red-700"
                  :aria-label="`Remove ${item.name} from cart`"
                  @click="cartStore.removeItem(item.id)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
          <div class="card-mtg">
            <div class="flex justify-between items-center mb-4">
              <span class="font-cinzel text-xl font-bold">Total:</span>
              <span class="font-cinzel text-xl font-bold text-teal-600"
                >${{ cartStore.total.toFixed(2) }}</span
              >
            </div>
            <button class="btn-primary w-full py-4" aria-label="Proceed to checkout">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCartStore } from '../stores/cart'

const cartStore = useCartStore()
</script>
