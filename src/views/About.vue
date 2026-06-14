<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="font-cinzel text-4xl font-bold text-center mb-12 text-gray-800">
          About The Outpost Games
        </h1>

        <div class="space-y-12">
          <!-- Hero Section -->
          <div class="card-mtg text-center">
            <h2 class="font-cinzel text-2xl font-bold mb-4 text-gray-800">
              Welcome to Rio Grande City's Premier MTG Destination
            </h2>
            <p class="text-lg text-gray-600">
              The Outpost Games has been serving the Magic: The Gathering community in South Texas
              with passion and dedication. We're more than just a card shop – we're a gathering
              place for planeswalkers of all skill levels.
            </p>
          </div>

          <!-- Mission Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="card-mtg">
              <h3 class="font-cinzel text-xl font-bold mb-4 text-gray-800">Our Mission</h3>
              <p class="text-gray-600">
                To foster a welcoming and inclusive community where Magic players can connect,
                compete, and grow together. We strive to provide excellent customer service, fair
                prices, and a clean, comfortable environment for all our customers.
              </p>
            </div>
            <div class="card-mtg">
              <h3 class="font-cinzel text-xl font-bold mb-4 text-gray-800">What We Offer</h3>
              <ul class="text-gray-600 space-y-2">
                <li>• Wide selection of MTG singles and sealed products</li>
                <li>• Weekly tournaments and events</li>
                <li>• Friendly and knowledgeable staff</li>
                <li>• Clean and spacious gaming area</li>
                <li>• Competitive pricing on all products</li>
                <li>• Special orders and card searches</li>
              </ul>
            </div>
          </div>

          <!-- Store Info -->
          <div class="card-mtg">
            <h3 class="font-cinzel text-2xl font-bold mb-6 text-gray-800 text-center">
              Visit Our Store
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="text-center">
                <div
                  class="w-16 h-16 bg-outpost-navy rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Location</h4>
                <a
                  href="https://maps.app.goo.gl/BqKucUkatQgWTmjM7"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gray-600 text-sm hover:text-outpost-gold transition-colors block"
                >
                  605 W. Main Street, Suite 4<br />
                  Rio Grande City, TX 78582
                </a>
              </div>
              <div class="text-center">
                <div
                  class="w-16 h-16 bg-outpost-gold rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-8 h-8 text-outpost-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Hours</h4>
                <p class="text-gray-600 text-sm">
                  Monday - Wednesday: Closed<br />
                  Thursday - Sunday: 5:00 PM - 10:00 PM
                </p>
              </div>
              <div class="text-center">
                <div
                  class="w-16 h-16 bg-outpost-stone rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <svg
                    class="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 class="font-semibold text-gray-800 mb-2">Contact</h4>
                <p class="text-gray-600 text-sm">
                  <a
                    href="mailto:theoutpostgamingrgv@gmail.com"
                    class="hover:text-outpost-gold transition-colors"
                  >
                    theoutpostgamingrgv@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <!-- Community Section -->
          <div class="card-mtg">
            <h3 class="font-cinzel text-2xl font-bold mb-6 text-gray-800 text-center">
              Join Our Community
            </h3>
            <p class="text-gray-600 text-center mb-6">
              Stay connected with The Outpost Games community through our social media channels. Get
              updates on new arrivals, tournament results, and special events!
            </p>
            <div class="flex justify-center space-x-4">
              <a
                href="https://www.facebook.com/Theoutpostgames/"
                target="_blank"
                class="btn-primary px-6 py-3 flex items-center space-x-2"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                <span>Facebook</span>
              </a>
              <a
                href="https://discord.gg/PW3YkMtFmz"
                target="_blank"
                class="btn-secondary px-6 py-3 flex items-center space-x-2"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"
                  />
                </svg>
                <span>Discord</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// About page
</script>
