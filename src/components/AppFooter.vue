<template>
  <footer class="bg-gray-800 text-white pt-16 pb-8">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        <!-- Store Info -->
        <div>
          <div class="flex items-center space-x-3 mb-4">
            <img
              src="/src/assets/logo.jpg"
              alt="The Outpost Games Logo"
              class="w-10 h-10 rounded-lg object-contain"
              loading="lazy"
              width="40"
              height="40"
            />
            <h3 class="font-cinzel text-xl font-bold text-gradient">The Outpost Games</h3>
          </div>
          <p class="text-gray-300 mb-4">
            Your premier destination for Magic: The Gathering in Rio Grande City, Texas.
          </p>
          <div class="flex space-x-4">
            <a
              :href="socialLinks.facebook"
              target="_blank"
              class="text-gray-300 hover:text-outpost-gold transition-colors duration-200"
              title="Facebook"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                />
              </svg>
            </a>
            <a
              :href="socialLinks.discord"
              target="_blank"
              class="text-gray-300 hover:text-outpost-gold transition-colors duration-200"
              title="Discord"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"
                />
              </svg>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h4 class="font-cinzel font-semibold text-lg mb-4 text-outpost-gold">Quick Links</h4>
          <ul class="space-y-2">
            <li v-for="link in quickLinks" :key="link.name">
              <router-link
                :to="link.path"
                class="text-gray-300 hover:text-outpost-gold transition-colors duration-200"
              >
                {{ link.name }}
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Store Hours -->
        <div>
          <h4 class="font-cinzel font-semibold text-lg mb-4 text-outpost-gold">Store Hours</h4>
          <div class="space-y-2 text-gray-300">
            <div v-for="(hours, day) in storeHours" :key="day" class="flex justify-between">
              <span>{{ day }}:</span>
              <span class="font-medium">{{ hours }}</span>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div>
          <h4 class="font-cinzel font-semibold text-lg mb-4 text-outpost-gold">Contact Info</h4>
          <div class="space-y-3 text-gray-300">
            <div class="flex items-start space-x-2">
              <MapPinIcon class="w-5 h-5 text-outpost-gold flex-shrink-0 mt-0.5" />
              <a
                :href="contactInfo.mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm hover:text-outpost-gold transition-colors duration-200"
              >
                {{ contactInfo.address }}
              </a>
            </div>
            <div class="flex items-center space-x-2">
              <EnvelopeIcon class="w-5 h-5 text-outpost-gold flex-shrink-0" />
              <a
                :href="`mailto:${contactInfo.email}`"
                class="text-sm hover:text-outpost-gold transition-colors duration-200"
              >
                {{ contactInfo.email }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-gray-600 pt-8">
        <!-- Wizards Fan Content Policy Disclaimer -->
        <div class="text-center mb-6">
          <p class="text-xs text-gray-400 max-w-4xl mx-auto leading-relaxed">
            This website is unofficial Fan Content permitted under the Fan Content Policy. Not
            approved/endorsed by Wizards. Portions of the materials used are property of Wizards of
            the Coast. ©Wizards of the Coast LLC.
          </p>
        </div>

        <div class="flex flex-col md:flex-row justify-between items-center">
          <p class="text-sm text-gray-300 mb-4 md:mb-0">
            &copy; {{ currentYear }} The Outpost Games. All rights reserved.
          </p>
          <div class="flex items-center space-x-4 mb-4 md:mb-0">
            <router-link
              to="/terms"
              class="text-xs text-gray-400 hover:text-outpost-gold transition-colors duration-200"
            >
              Terms
            </router-link>
            <router-link
              to="/privacy"
              class="text-xs text-gray-400 hover:text-outpost-gold transition-colors duration-200"
            >
              Privacy
            </router-link>
          </div>
          <p class="text-xs text-gray-400">
            Built with ❤️ for the MTG community in Rio Grande City, TX
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { MapPinIcon, EnvelopeIcon } from '@heroicons/vue/24/outline'

const currentYear = new Date().getFullYear()

const socialLinks = {
  facebook: 'https://www.facebook.com/Theoutpostgames/',
  discord: 'https://discord.gg/PW3YkMtFmz',
}

const quickLinks = [
  { name: 'Products', path: '/products' },
  { name: 'Events Calendar', path: '/events' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
]

const storeHours = {
  'Mon-Wed': 'Closed',
  Thursday: '5:00 PM - 10:00 PM',
  Friday: '5:00 PM - 10:00 PM',
  Saturday: '5:00 PM - 10:00 PM',
  Sunday: '5:00 PM - 10:00 PM',
}

const contactInfo = {
  address: '605 W. Main Street, Suite 4, Rio Grande City, TX 78582',
  email: 'theoutpostgamingrgv@gmail.com',
  mapsUrl: 'https://maps.app.goo.gl/BqKucUkatQgWTmjM7',
}
</script>
