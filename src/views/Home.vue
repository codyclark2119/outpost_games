<template>
  <div class="min-h-screen">
    <!-- Hero Section with Side Carousels and Magical Particles -->
    <section class="hero-section flex items-center justify-center px-4 relative overflow-hidden">
      <!-- Magical particles -->
      <div class="particles-container absolute inset-0 pointer-events-none">
        <div
          v-for="i in 20"
          :key="i"
          class="magical-particle"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            transform: 'translate3d(0, 0, 0)',
          }"
        ></div>
      </div>
      <!-- Left Carousel - TMNT -->
      <div class="hidden xl:flex xl:items-center w-80 flex-shrink-0">
        <div class="relative w-full">
          <transition name="slide-left" mode="out-in">
            <img
              :key="currentLeftBanner"
              :src="tmntBanners[currentLeftBanner]"
              alt="TMNT Banner"
              class="w-full h-auto max-h-[800px] object-contain rounded-r-xl shadow-2xl"
              fetchpriority="high"
              width="320"
              height="800"
              loading="eager"
            />
          </transition>
        </div>
      </div>

      <!-- Center Content -->
      <div class="container mx-auto text-center z-10">
        <div class="hero-content">
          <h1 class="font-cinzel text-5xl md:text-7xl font-bold text-white mb-6 hero-title">
            Welcome to
            <span class="text-gradient block mt-2">The Outpost Games</span>
          </h1>
          <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto hero-subtitle">
            Your premier destination for Magic: The Gathering in Rio Grande City, Texas. Join our
            community of passionate planeswalkers!
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center hero-buttons">
            <router-link to="/products" class="btn-primary px-8 py-4 text-lg">
              View Products
            </router-link>
            <router-link to="/events" class="btn-secondary px-8 py-4 text-lg">
              View Events
            </router-link>
          </div>
        </div>
      </div>

      <!-- Right Carousel - Lorwyn -->
      <div class="hidden xl:flex xl:items-center w-80 flex-shrink-0">
        <div class="relative w-full">
          <transition name="slide-right" mode="out-in">
            <img
              :key="currentRightBanner"
              :src="lorwynBanners[currentRightBanner]"
              alt="Lorwyn Banner"
              class="w-full h-auto max-h-[800px] object-contain rounded-l-xl shadow-2xl"
              fetchpriority="high"
              width="320"
              height="800"
              loading="eager"
            />
          </transition>
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Featured Event Banner -->
    <transition name="fade-in">
      <section v-if="displayEvent" class="py-10 bg-outpost-navy relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-outpost-gold/10 via-transparent to-outpost-gold/5 pointer-events-none"></div>
        <div class="container mx-auto px-4 relative z-10">
          <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
            <!-- Left: label + details -->
            <div class="flex-grow">
              <div class="flex items-center gap-3 mb-2">
                <p class="text-outpost-gold text-xs font-bold uppercase tracking-widest">
                  {{ displayEvent.isWeekly ? 'Next Weekly Event' : 'Next Special Event' }}
                </p>
                <span v-if="displayEvent.isWeekly" class="inline-flex items-center gap-1 text-xs text-outpost-gold/60 border border-outpost-gold/30 rounded-full px-2 py-0.5">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                  </svg>
                  Every week
                </span>
              </div>
              <h2 class="font-cinzel text-2xl md:text-3xl font-bold text-white mb-2">{{ displayEvent.title }}</h2>
              <div class="flex flex-wrap gap-4 text-gray-300 text-sm mb-3">
                <span>📅 {{ displayEvent.date }}</span>
                <span>🕐 {{ displayEvent.time }}</span>
                <span v-if="!displayEvent.isWeekly">💰 ${{ displayEvent.entry }} entry</span>
                <span
                  v-if="displayEvent.gameTypeName"
                  class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="displayEvent.gameTypeId === 'pokemon' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-outpost-gold/20 text-outpost-gold'"
                >
                  {{ displayEvent.gameTypeName }}
                </span>
              </div>
              <p class="text-gray-400 text-sm line-clamp-2">{{ displayEvent.description }}</p>
            </div>
            <!-- Right: CTA -->
            <div class="flex-shrink-0">
              <router-link
                to="/events"
                class="inline-flex items-center gap-2 bg-outpost-gold hover:bg-outpost-gold-light text-outpost-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-outpost-gold/30 whitespace-nowrap"
              >
                View All Events
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </transition>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Featured Products Carousel -->
    <section class="py-20 bg-outpost-navy relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-radial from-outpost-gold/10 via-transparent to-transparent opacity-30"></div>

      <div class="container mx-auto px-4 relative z-10">
        <transition name="slide-left" mode="out-in">
          <div :key="currentFeaturedIndex">
            <h2 class="font-cinzel text-4xl font-bold text-center mb-4 text-outpost-gold section-heading">
              {{ currentSlide.title }}
            </h2>
            <p class="text-center text-gray-300 mb-12 text-lg">
              {{ currentSlide.subtitle }}
            </p>
            <div class="max-w-5xl mx-auto">
              <div class="featured-image-container relative group">
                <div class="absolute inset-0 bg-gradient-to-t from-outpost-navy via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                <img
                  :src="currentSlide.imageUrl"
                  :alt="currentSlide.title"
                  class="w-full h-auto rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:scale-105"
                  loading="lazy"
                  width="1800"
                  height="1200"
                />
              </div>
              <div class="text-center mt-8">
                <router-link
                  :to="currentSlide.linkTo"
                  class="btn-primary px-8 py-4 text-lg inline-block"
                >
                  {{ currentSlide.linkText }}
                </router-link>
              </div>
            </div>
          </div>
        </transition>

        <!-- Dot indicators — only shown when there are multiple slides -->
        <div v-if="featuredSlides.length > 1" class="flex justify-center gap-3 mt-10">
          <button
            v-for="(slide, i) in featuredSlides"
            :key="slide.id"
            class="transition-all duration-300 rounded-full"
            :class="i === currentFeaturedIndex ? 'w-6 h-2 bg-outpost-gold' : 'w-2 h-2 bg-outpost-gold/30 hover:bg-outpost-gold/60'"
            :aria-label="`Go to slide ${i + 1}: ${slide.title}`"
            @click="goToSlide(i)"
          />
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Weekly Events Section -->
    <section class="py-20 bg-gradient-to-br from-gray-50 to-gray-100 relative">
      <div class="container mx-auto px-4">
        <h2 class="font-cinzel text-4xl font-bold text-center mb-4 text-gray-800 section-heading">
          Weekly Events
        </h2>
        <p class="text-center text-gray-600 mb-12 text-lg">
          Join us for epic battles and unforgettable moments
        </p>
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(event, index) in weeklyEvents"
            :key="event.day"
            class="card-mtg text-center event-card group"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div
              class="w-16 h-16 bg-gradient-to-br from-outpost-navy to-outpost-navy-light rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-outpost-gold/50 transition-all duration-300 group-hover:scale-110"
            >
              <CalendarDaysIcon class="w-8 h-8 text-outpost-gold" />
            </div>
            <h3 class="font-cinzel font-semibold text-xl mb-2 text-outpost-navy">
              {{ event.day }}
            </h3>
            <p class="text-gray-800 font-medium text-lg mb-2">{{ event.event }}</p>
            <p class="text-gray-600">{{ event.time }}</p>
            <div
              class="absolute inset-0 bg-gradient-to-br from-outpost-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
            ></div>
          </div>
        </div>

        <div class="text-center mt-12">
          <router-link to="/events" class="btn-secondary px-8 py-4 inline-flex items-center gap-2">
            View Full Calendar
            <svg
              class="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              ></path>
            </svg>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Community Section -->
    <section class="py-20 bg-white relative overflow-hidden">
      <!-- Decorative background -->
      <div
        class="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-outpost-gold/5 to-transparent"
      ></div>

      <div class="container mx-auto px-4 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div class="community-content">
            <h2 class="font-cinzel text-4xl font-bold mb-6 text-gray-800 section-heading">
              Join Our Community
            </h2>
            <p class="text-lg text-gray-600 mb-6 leading-relaxed">
              Connect with fellow planeswalkers, stay updated on the latest events, and be part of
              Rio Grande City's premier MTG community.
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a
                href="https://www.facebook.com/Theoutpostgames/"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary inline-flex items-center justify-center gap-2 group"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                Join our Facebook
              </a>
              <a
                href="https://discord.gg/PW3YkMtFmz"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-secondary inline-flex items-center justify-center gap-2 group"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
                  />
                </svg>
                Join our Discord
              </a>
            </div>
          </div>
          <div
            class="relative h-96 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 group"
          >
            <div
              class="absolute inset-0 bg-gradient-to-t from-outpost-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            ></div>
            <img
              src="/src/assets/logo.jpg"
              alt="The Outpost Games"
              class="w-full h-full object-contain"
              loading="lazy"
              width="600"
              height="600"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import { useEventsStore } from '../stores/events'

const eventsStore = useEventsStore()

// ── Date helper ───────────────────────────────────────────────────────────────
const parseEventDate = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return new Date(dateString + 'T12:00:00')
  const parsed = new Date(dateString)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

// ── Featured event: next special event from API ───────────────────────────────
const nextSpecialEvent = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventsStore.upcomingEvents
    .filter(e => {
      const d = parseEventDate(e.date)
      d.setHours(0, 0, 0, 0)
      return d >= today
    })
    .sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime())[0]
})

// ── Featured event: fallback to next weekly recurring event ───────────────────
interface DisplayEvent {
  title: string
  date: string
  time: string
  entry: string
  description: string
  gameTypeId?: string
  gameTypeName?: string
  isWeekly: boolean
}

const weeklyDefs = [
  { jsDay: 4, dayName: 'Thursday', eventName: 'Standard',    description: 'Standard format tournament with prizes for top finishers' },
  { jsDay: 5, dayName: 'Friday',   eventName: 'cEDH',        description: 'Competitive Commander tournament for experienced players' },
  { jsDay: 6, dayName: 'Saturday', eventName: 'Bracket 3',   description: 'Swiss tournament format with elimination rounds' },
  { jsDay: 0, dayName: 'Sunday',   eventName: 'League Event', description: 'Ongoing league play with seasonal prizes' },
]

const nextWeeklyEvent = computed((): DisplayEvent | null => {
  const now = new Date()
  const todayDay = now.getDay()
  const eventStartedToday = now.getHours() >= 18

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const targetDay = (todayDay + daysAhead) % 7
    const def = weeklyDefs.find(e => e.jsDay === targetDay)
    if (!def) continue
    if (daysAhead === 0 && eventStartedToday) continue

    const date = new Date()
    date.setDate(date.getDate() + daysAhead)
    return {
      title: def.eventName,
      date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      time: '6:00 PM',
      entry: '0.00',
      description: def.description,
      gameTypeId: 'magic',
      gameTypeName: 'Magic: The Gathering',
      isWeekly: true,
    }
  }
  return null
})

// Prefer a real special event; fall back to the next weekly slot
const displayEvent = computed((): DisplayEvent | null => {
  if (nextSpecialEvent.value) return { ...nextSpecialEvent.value, isWeekly: false }
  return nextWeeklyEvent.value
})

// ── Featured products carousel ────────────────────────────────────────────────
interface FeaturedSlide {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  linkTo: string
  linkText: string
}

const featuredSlides: FeaturedSlide[] = [
  {
    id: 'tmnt',
    title: 'Featured: Teenage Mutant Ninja Turtles',
    subtitle: 'Discover the latest collection from the sewers to your tabletop',
    imageUrl: '/wpn-assets/tmnt/posters/TMT_oversized_art_72x48_en.jpg',
    linkTo: '/products/magic?set=tmnt',
    linkText: 'Shop TMNT Products',
  },
]

const currentFeaturedIndex = ref(0)
const currentSlide = computed(() => featuredSlides[currentFeaturedIndex.value] ?? featuredSlides[0]!)
let featuredInterval: number | null = null

const startFeaturedInterval = () => {
  if (featuredInterval) clearInterval(featuredInterval)
  if (featuredSlides.length > 1) {
    featuredInterval = window.setInterval(() => {
      currentFeaturedIndex.value = (currentFeaturedIndex.value + 1) % featuredSlides.length
    }, 6000)
  }
}

const goToSlide = (index: number) => {
  currentFeaturedIndex.value = index
  startFeaturedInterval()
}

// ── Hero side-carousels ───────────────────────────────────────────────────────
const tmntBanners = ['/wpn-assets/tmnt/banners/TMT_oversized_art_34x80_en.jpg']
const lorwynBanners = ['/wpn-assets/lorwyn-eclipsed/banners/ECL_oversized_art_34x80_en.png']

const currentLeftBanner = ref(0)
const currentRightBanner = ref(0)
let leftInterval: number | null = null
let rightInterval: number | null = null

onMounted(() => {
  eventsStore.fetchEvents()

  leftInterval = window.setInterval(() => {
    currentLeftBanner.value = (currentLeftBanner.value + 1) % tmntBanners.length
  }, 5000)

  rightInterval = window.setInterval(() => {
    currentRightBanner.value = (currentRightBanner.value + 1) % lorwynBanners.length
  }, 6000)

  startFeaturedInterval()
})

onUnmounted(() => {
  if (leftInterval) clearInterval(leftInterval)
  if (rightInterval) clearInterval(rightInterval)
  if (featuredInterval) clearInterval(featuredInterval)
})

const weeklyEvents = [
  { day: 'Thursday', event: 'Standard',    time: '6:00 PM' },
  { day: 'Friday',   event: 'cEDH',        time: '6:00 PM' },
  { day: 'Saturday', event: 'Bracket 3',   time: '6:00 PM' },
  { day: 'Sunday',   event: 'League Event', time: '6:00 PM' },
]
</script>

<style scoped>
/* Particles container */
.particles-container {
  z-index: 1;
}

/* Hero content animations */
.hero-content {
  animation: fadeInUp 1s ease-out;
}

.hero-title {
  animation: fadeInUp 1s ease-out 0.2s both;
  text-shadow: 0 2px 20px rgba(212, 175, 55, 0.3);
}

.hero-subtitle {
  animation: fadeInUp 1s ease-out 0.4s both;
}

.hero-buttons {
  animation: fadeInUp 1s ease-out 0.6s both;
}

/* Section heading animation */
.section-heading {
  position: relative;
  display: inline-block;
  animation: fadeInUp 0.8s ease-out;
}

.section-heading::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: linear-gradient(to right, transparent, #d4af37, transparent);
  animation: expandWidth 0.8s ease-out 0.3s both;
}

@keyframes expandWidth {
  from {
    width: 0%;
  }
  to {
    width: 60%;
  }
}

/* Event cards staggered animation */
.event-card {
  position: relative;
  animation: fadeInUp 0.6s ease-out both;
}

/* Featured image container */
.featured-image-container {
  animation: fadeInScale 0.8s ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Community content animation */
.community-content {
  animation: slideInLeft 0.8s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Carousel transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

/* Banner hover effects */
.slide-left-enter-active img,
.slide-right-enter-active img {
  filter: brightness(1);
  transition: filter 0.3s ease;
}

.fade-in-enter-active { transition: opacity 0.4s ease; }
.fade-in-enter-from { opacity: 0; }

/* Radial gradient utility */
.bg-gradient-radial {
  background: radial-gradient(circle, var(--tw-gradient-stops));
}

/* Enhanced hover state for images */
img {
  transition:
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.4s ease,
    box-shadow 0.4s ease;
}

/* Glow effect on hover for featured images */
.featured-image-container:hover img {
  box-shadow:
    0 20px 60px rgba(212, 175, 55, 0.3),
    0 0 40px rgba(212, 175, 55, 0.2);
}
</style>
