<template>
  <div class="min-h-screen">
    <!-- Hero Section with Side Carousels and Magical Particles -->
    <section class="hero-section flex items-center justify-center px-4 relative overflow-hidden">
      <!-- Magical particles -->
      <div class="particles-container absolute inset-0 pointer-events-none">
        <div
          v-for="particle in particles"
          :key="particle.id"
          class="magical-particle"
          :style="particle.style"
        ></div>
      </div>

      <!-- Center Content -->
      <div class="container mx-auto text-center z-10">
        <div class="hero-content">
          <h1 class="font-cinzel text-5xl md:text-7xl font-bold text-white mb-6 hero-title">
            Welcome to
            <span class="text-gradient block mt-2">The Outpost Games</span>
          </h1>
          <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto hero-subtitle">
            Rio Grande City's premier TCG shop — Magic: The Gathering, Pokémon, One Piece, Gundam,
            and Riftbound. Join our community of players.
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
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Featured Event Banner -->
    <transition name="fade-in">
      <section v-if="featuredDay" class="py-10 bg-outpost-navy relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-r from-outpost-gold/10 via-transparent to-outpost-gold/5 pointer-events-none"
        ></div>
        <div class="container mx-auto px-4 relative z-10">
          <div
            class="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-6"
          >
            <!-- Left: label + details -->
            <div class="flex-grow w-full">
              <div class="flex items-center gap-3 mb-2">
                <p class="text-outpost-gold text-xs font-bold uppercase tracking-widest">
                  {{
                    featuredDay.hasWeekly && featuredDay.hasSpecial
                      ? 'Next Events'
                      : featuredDay.hasWeekly
                        ? 'Next Weekly Events'
                        : 'Next Special Event'
                  }}
                </p>
                <span
                  v-if="featuredDay.hasWeekly"
                  class="inline-flex items-center gap-1 text-xs text-outpost-gold/60 border border-outpost-gold/30 rounded-full px-2 py-0.5"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Every week
                </span>
              </div>
              <p class="text-gray-300 text-sm mb-3">📅 {{ featuredDay.date }}</p>

              <div class="divide-y divide-white/10">
                <div
                  v-for="(event, index) in featuredDay.events"
                  :key="event.title"
                  :class="index > 0 ? 'pt-3 mt-3' : ''"
                >
                  <h2 class="font-cinzel text-xl md:text-2xl font-bold text-white mb-1">
                    {{ event.title }}
                  </h2>
                  <div class="flex flex-wrap gap-4 text-gray-300 text-sm mb-1">
                    <span>🕐 {{ event.time }}</span>
                    <span v-if="!event.isWeekly">💰 ${{ event.entry }} entry</span>
                    <span
                      v-if="event.gameTypeName"
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      :class="
                        event.gameTypeId === 'pokemon'
                          ? 'bg-yellow-400/20 text-yellow-300'
                          : 'bg-outpost-gold/20 text-outpost-gold'
                      "
                    >
                      {{ event.gameTypeName }}
                    </span>
                  </div>
                  <p class="text-gray-400 text-sm line-clamp-2">{{ event.description }}</p>
                </div>
              </div>
            </div>
            <!-- Right: CTA -->
            <div class="flex-shrink-0 flex flex-col items-stretch gap-2">
              <router-link
                to="/events"
                class="inline-flex items-center justify-center gap-2 bg-outpost-gold hover:bg-outpost-gold-light text-outpost-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-outpost-gold/30 whitespace-nowrap"
              >
                View All Events
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </router-link>
              <a
                :href="STORE_INFO.social.discord"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-1 text-outpost-gold/80 hover:text-outpost-gold text-sm font-semibold whitespace-nowrap transition-colors"
              >
                Join us on Discord
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </transition>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Marketing Posters Carousel — auto-populated from public/wpn-assets/posters/ -->
    <section
      v-if="posters.length > 0 && currentSlide"
      class="py-20 bg-outpost-navy relative overflow-hidden"
      @mouseenter="pauseFeaturedInterval"
      @mouseleave="startFeaturedInterval"
      @focusin="pauseFeaturedInterval"
      @focusout="startFeaturedInterval"
    >
      <div
        class="absolute inset-0 bg-gradient-radial from-outpost-gold/10 via-transparent to-transparent opacity-30"
      ></div>

      <div class="container mx-auto px-4 relative z-10">
        <transition name="slide-left" mode="out-in">
          <div :key="currentFeaturedIndex">
            <h2
              class="font-cinzel text-4xl font-bold text-center mb-12 text-outpost-gold section-heading"
            >
              {{ currentSlide.title }}
            </h2>
            <div class="max-w-5xl mx-auto">
              <div
                class="featured-image-container relative group aspect-video rounded-2xl shadow-2xl overflow-hidden bg-outpost-black"
              >
                <div
                  class="absolute inset-0 bg-gradient-to-t from-outpost-navy via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
                ></div>
                <img
                  :src="currentSlide.imageUrl"
                  :alt="currentSlide.alt || currentSlide.title"
                  class="w-full h-full object-contain transform transition-all duration-500 group-hover:scale-105"
                  loading="lazy"
                  width="1920"
                  height="1080"
                />
              </div>
              <div class="text-center mt-8">
                <router-link to="/products" class="btn-primary px-8 py-4 text-lg inline-block">
                  Shop Now
                </router-link>
              </div>
            </div>
          </div>
        </transition>

        <div v-if="posters.length > 1" class="flex items-center justify-center gap-2 mt-10">
          <button
            type="button"
            class="w-11 h-11 rounded-full border border-outpost-gold/30 text-outpost-gold"
            aria-label="Previous poster"
            @click="previousFeaturedSlide"
          >
            ‹
          </button>
          <div class="flex items-center">
            <button
              v-for="(slide, i) in posters"
              :key="slide.id"
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-full"
              :aria-label="`Go to slide ${i + 1}: ${slide.title}`"
              :aria-current="i === currentFeaturedIndex ? 'true' : undefined"
              @click="goToSlide(i)"
            >
              <span
                class="block h-2 rounded-full transition-all duration-300"
                :class="
                  i === currentFeaturedIndex
                    ? 'w-6 bg-outpost-gold'
                    : 'w-2 bg-outpost-gold/30 hover:bg-outpost-gold/60'
                "
              ></span>
            </button>
          </div>
          <button
            type="button"
            class="w-11 h-11 rounded-full border border-outpost-gold/30 text-outpost-gold"
            aria-label="Next poster"
            @click="nextFeaturedSlide"
          >
            ›
          </button>
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Multi-TCG Showcase -->
    <Suspense>
      <MultiTcgShowcase />
    </Suspense>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- About / Story Section -->
    <section id="about" class="py-20 bg-white relative overflow-hidden scroll-mt-24">
      <div class="container mx-auto px-4">
        <h2 class="font-cinzel text-4xl font-bold text-center mb-12 text-gray-800 section-heading">
          About The Outpost Games
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div class="card">
            <h3 class="font-cinzel text-xl font-bold mb-4 text-gray-800">Our Mission</h3>
            <p class="text-gray-600">
              To foster a welcoming and inclusive community where players of every game we carry can
              connect, compete, and grow together. We strive to provide excellent customer service,
              fair prices, and a clean, comfortable environment for all our customers.
            </p>
          </div>
          <div class="card">
            <h3 class="font-cinzel text-xl font-bold mb-4 text-gray-800">What We Offer</h3>
            <ul class="text-gray-600 space-y-2">
              <li>
                • Singles and sealed product across Magic, Pokémon, One Piece, Gundam, and Riftbound
              </li>
              <li>• Weekly tournaments and special events</li>
              <li>• Friendly and knowledgeable staff</li>
              <li>• Clean and spacious gaming area</li>
              <li>• Competitive pricing on all products</li>
              <li>• Special orders and card searches</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Discord + Instagram CTA -->
    <Suspense>
      <SocialCtaSection />
    </Suspense>

    <!-- Section Divider -->
    <div class="section-divider container mx-auto"></div>

    <!-- Visit Us / Contact Section -->
    <section
      id="contact"
      class="py-20 bg-gradient-to-br from-gray-50 to-gray-100 relative scroll-mt-24"
    >
      <div class="container mx-auto px-4">
        <h2 class="font-cinzel text-4xl font-bold text-center mb-12 text-gray-800 section-heading">
          Visit Us
        </h2>
        <div class="card max-w-3xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div
                class="w-14 h-14 bg-outpost-navy rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <MapPinIcon class="w-7 h-7 text-white" />
              </div>
              <h4 class="font-semibold text-gray-800 mb-2">Location</h4>
              <a
                :href="STORE_INFO.mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-600 text-sm hover:text-outpost-gold transition-colors block"
              >
                {{ STORE_INFO.address.line1 }}<br />
                {{ STORE_INFO.address.city }}, {{ STORE_INFO.address.state }}
                {{ STORE_INFO.address.zip }}
              </a>
            </div>
            <div>
              <div
                class="w-14 h-14 bg-outpost-gold rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <ClockIcon class="w-7 h-7 text-outpost-black" />
              </div>
              <h4 class="font-semibold text-gray-800 mb-2">Hours</h4>
              <p class="text-gray-600 text-sm">
                <span v-for="(hours, day) in STORE_INFO.hours" :key="day" class="block">
                  {{ day }}: {{ hours }}
                </span>
              </p>
            </div>
            <div>
              <div
                class="w-14 h-14 bg-outpost-stone rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <EnvelopeIcon class="w-7 h-7 text-white" />
              </div>
              <h4 class="font-semibold text-gray-800 mb-2">Contact</h4>
              <a
                :href="`mailto:${STORE_INFO.email}`"
                class="text-gray-600 text-sm hover:text-outpost-gold transition-colors"
              >
                {{ STORE_INFO.email }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { MapPinIcon, ClockIcon, EnvelopeIcon } from '@heroicons/vue/24/outline'
import { useEventsStore } from '../stores/events'
import { useWeeklyOverridesStore } from '../stores/weeklyOverrides'
import { STORE_INFO } from '../config/storeInfo'
import { WEEKLY_SCHEDULE } from '../config/weeklySchedule'
import {
  addDaysToISODate,
  eventDateToISO,
  formatStoreDateLabel,
  getStoreTodayISO,
  hasEventStarted,
  weekdayFromISODate,
} from '../utils/eventDateTime'
import { scrollToSectionId, cancelPendingSectionScroll } from '../utils/scrollToSection'
import { usePageMeta } from '../composables/usePageMeta'

const MultiTcgShowcase = defineAsyncComponent(() => import('./home-sections/MultiTcgShowcase.vue'))
const SocialCtaSection = defineAsyncComponent(() => import('./home-sections/SocialCtaSection.vue'))

usePageMeta({
  title: 'The Outpost Games — TCG Shop in Rio Grande City, TX',
  description:
    'Your premier destination for Magic: The Gathering, Pokémon, One Piece, Gundam, and Riftbound in Rio Grande City, Texas. Weekly tournaments, singles, sealed product, and a community that plays together.',
  path: '/',
})

const route = useRoute()
const eventsStore = useEventsStore()
const weeklyOverridesStore = useWeeklyOverridesStore()

// ── Hero particles ────────────────────────────────────────────────────────────
// Rolled once here rather than inline in the template. A `:style` binding
// calling Math.random() is re-evaluated on every re-render of Home — and the
// poster carousel re-renders it every 6 seconds — so all 20 particles used to
// jump to new positions and restart their animations on each tick.
const particles = Array.from({ length: 20 }, (_, id) => ({
  id,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 3}s`,
    animationDuration: `${3 + Math.random() * 2}s`,
    transform: 'translate3d(0, 0, 0)',
  },
}))

// ── Featured day ──────────────────────────────────────────────────────────────
interface FeaturedDayEvent {
  title: string
  time: string
  entry: string
  description: string
  gameTypeId?: string
  gameTypeName?: string
  isWeekly: boolean
}
interface FeaturedDay {
  date: string
  hasWeekly: boolean
  hasSpecial: boolean
  events: FeaturedDayEvent[]
}
const featuredDay = computed((): FeaturedDay | null => {
  const now = new Date()
  const todayISO = getStoreTodayISO(now)
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const targetDateISO = addDaysToISODate(todayISO, daysAhead)
    const specials = eventsStore.upcomingEvents
      .filter(
        e =>
          e.isVisible !== false &&
          eventDateToISO(e.date) === targetDateISO &&
          !hasEventStarted(targetDateISO, e.time, now)
      )
      .map(e => ({
        title: e.title,
        time: e.time,
        entry: e.entry,
        description: e.description,
        gameTypeId: e.gameTypeId,
        gameTypeName: e.gameTypeName,
        isWeekly: false,
      }))
    const weekly = WEEKLY_SCHEDULE.filter(
      entry =>
        entry.jsDay === weekdayFromISODate(targetDateISO) &&
        !weeklyOverridesStore.overrides.some(
          o => o.weeklyEventId === entry.id && o.date === targetDateISO
        ) &&
        !hasEventStarted(targetDateISO, entry.time, now)
    ).map(entry => ({
      title: entry.eventName,
      time: entry.time,
      entry: '0.00',
      description: entry.description,
      gameTypeId: entry.gameTypeId,
      gameTypeName: entry.gameType,
      isWeekly: true,
    }))
    const events = [...specials, ...weekly].sort((a, b) => a.time.localeCompare(b.time))
    if (events.length)
      return {
        date: formatStoreDateLabel(targetDateISO),
        hasWeekly: weekly.length > 0,
        hasSpecial: specials.length > 0,
        events,
      }
  }
  return null
})

// ── Marketing posters carousel — auto-populated from public/wpn-assets/posters/,
// no admin step: drop an image in the folder and it shows up here.
interface MarketingPoster {
  id: string
  title: string
  alt?: string
  imageUrl: string
}
const posters = ref<MarketingPoster[]>([])
const currentFeaturedIndex = ref(0)
const currentSlide = computed(
  () => posters.value[currentFeaturedIndex.value] ?? posters.value[0] ?? null
)
let featuredInterval: number | null = null
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const pauseFeaturedInterval = () => {
  if (featuredInterval !== null) {
    clearInterval(featuredInterval)
    featuredInterval = null
  }
}
const nextFeaturedSlide = () => {
  if (posters.value.length)
    currentFeaturedIndex.value = (currentFeaturedIndex.value + 1) % posters.value.length
}
const previousFeaturedSlide = () => {
  if (posters.value.length)
    currentFeaturedIndex.value =
      (currentFeaturedIndex.value - 1 + posters.value.length) % posters.value.length
}
const startFeaturedInterval = () => {
  pauseFeaturedInterval()
  if (posters.value.length > 1 && !document.hidden && !reducedMotionQuery.matches)
    featuredInterval = window.setInterval(nextFeaturedSlide, 6000)
}
const handleCarouselVisibilityChange = () =>
  document.hidden ? pauseFeaturedInterval() : startFeaturedInterval()

const goToSlide = (index: number) => {
  currentFeaturedIndex.value = index
  startFeaturedInterval()
}

const fetchMarketingPosters = async () => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
    const response = await fetch(`${API_BASE_URL}/marketing-posters`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    posters.value = data.posters || []
  } catch (error) {
    console.error('Marketing posters fetch error:', error)
  }
}

onMounted(async () => {
  eventsStore.fetchEvents()
  weeklyOverridesStore.fetchOverrides()

  await fetchMarketingPosters()
  document.addEventListener('visibilitychange', handleCarouselVisibilityChange)
  reducedMotionQuery.addEventListener('change', handleCarouselVisibilityChange)
  startFeaturedInterval()
})

onUnmounted(() => {
  pauseFeaturedInterval()
  document.removeEventListener('visibilitychange', handleCarouselVisibilityChange)
  reducedMotionQuery.removeEventListener('change', handleCarouselVisibilityChange)
  // A hash-scroll chain started on mount can still be pending when the
  // visitor navigates away — leaving it running would scroll the page they
  // just landed on.
  cancelPendingSectionScroll()
})

// Arriving at '/' with a hash already set (cross-route section nav via
// useSectionNav, or a direct link like /#community) — scroll to it once
// mounted. The retry/cancellation rationale lives in scrollToSection.ts.
if (route.hash) {
  const targetId = route.hash.slice(1)
  nextTick(() => scrollToSectionId(targetId))
}
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

.fade-in-enter-active {
  transition: opacity 0.4s ease;
}
.fade-in-enter-from {
  opacity: 0;
}

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

/* Glow effect on hover for featured images — on the container, not the img,
   since the container now clips overflow (object-cover cropping to a fixed
   aspect ratio) and would hide a shadow placed on the img itself. */
.featured-image-container:hover {
  box-shadow:
    0 20px 60px rgba(212, 175, 55, 0.3),
    0 0 40px rgba(212, 175, 55, 0.2);
}
</style>
