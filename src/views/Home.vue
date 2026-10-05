<template>
  <div>
    <!-- Hero: what the shop is, whether it's open, and the three things a
         visitor on a phone usually wants next. -->
    <section class="relative isolate overflow-hidden bg-outpost-navy-dark text-white">
      <!-- The shop's emblem as a large frosted backdrop rather than a side
           image, so it shows at every width (phones included) without taking
           space from the copy: the badge, then a blurred navy layer over it. -->
      <img
        :src="badgeUrl"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 -right-28 -z-10 w-[26rem] max-w-none -translate-y-1/2 sm:-right-16 sm:w-[32rem] lg:right-0 lg:w-[38rem]"
        width="608"
        height="608"
        fetchpriority="high"
      />
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-outpost-navy-dark/70 backdrop-blur-[2px]"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.18),transparent_60%)]"
        aria-hidden="true"
      ></div>
      <div class="page-shell py-12 sm:py-20">
        <div class="max-w-2xl">
          <p class="text-xs font-semibold tracking-[0.16em] text-outpost-gold uppercase">
            Rio Grande City, TX
          </p>
          <h1
            class="mt-3 font-display text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl"
          >
            Your local card game shop
          </h1>
          <p class="mt-4 max-w-xl text-lg text-slate-200">
            Sealed product, singles, and weekly tournaments for Magic: The Gathering, Pokémon, One
            Piece, Gundam, and Riftbound — right on Main Street.
          </p>
          <p class="mt-5 text-sm text-slate-200">
            <StoreStatus />
          </p>
          <div class="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <router-link to="/products" class="btn-primary col-span-2 py-3 sm:col-span-1">
              <ShoppingBagIcon class="h-5 w-5" aria-hidden="true" />
              See what's in stock
            </router-link>
            <router-link to="/events" class="btn-on-dark py-3">
              <CalendarDaysIcon class="h-5 w-5" aria-hidden="true" />
              Events
            </router-link>
            <a
              :href="STORE_INFO.mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-on-dark py-3"
            >
              <MapPinIcon class="h-5 w-5" aria-hidden="true" />
              Directions
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- This week -->
    <section class="page-shell py-10 sm:py-14">
      <SectionHeading eyebrow="This week" title="At the shop" to="/events" link-label="Calendar" />
      <div
        v-if="eventsLoading && !agenda.length"
        class="mt-5 h-48 animate-pulse rounded-2xl bg-slate-200/60"
        role="status"
        aria-label="Loading events"
      ></div>
      <AgendaList v-else-if="agenda.length" :days="agenda" class="mt-5" />
      <p v-else class="mt-5 text-slate-600">
        Nothing on the calendar this week — watch our Discord for announcements.
      </p>
    </section>

    <!-- Shop by game -->
    <section class="border-y border-slate-200 bg-white py-10 sm:py-14">
      <div class="page-shell">
        <SectionHeading
          eyebrow="Products"
          title="Shop by game"
          to="/products"
          link-label="All products"
        />
        <div class="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          <router-link
            v-for="tile in gameTiles"
            :key="tile.slug"
            :to="tile.to"
            class="flex items-center gap-3 rounded-xl border border-slate-200 bg-outpost-paper py-3 pr-3 pl-3 transition-colors hover:border-outpost-navy/40"
          >
            <span
              class="h-9 w-1.5 shrink-0 rounded-full"
              :style="{ backgroundColor: tile.accent }"
              aria-hidden="true"
            ></span>
            <span class="min-w-0">
              <span class="block truncate font-semibold text-outpost-navy">{{ tile.label }}</span>
              <span v-if="tile.count" class="block text-xs text-slate-500">
                {{ tile.count }} in stock
              </span>
            </span>
          </router-link>
        </div>
      </div>
    </section>

    <!-- New arrivals, straight from Square -->
    <section v-if="newArrivals.length" class="page-shell py-10 sm:py-14">
      <SectionHeading eyebrow="Just in" title="New arrivals" to="/products" link-label="Shop all" />
      <!-- Swipeable row on phones/tablets; one 5-up grid row on desktop -->
      <div class="scroll-row mt-5 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:px-0">
        <router-link
          v-for="(item, index) in newArrivals"
          :key="item.id"
          :to="`/products/${slugify(item.categoryName)}`"
          class="flex w-40 shrink-0 snap-start sm:w-48 lg:w-auto"
          :class="{ 'lg:hidden': index >= 5 }"
        >
          <ProductCard
            class="flex-1"
            :item="item"
            :subtitle="gameMeta(slugify(item.categoryName), item.categoryName).label"
          />
        </router-link>
      </div>
    </section>

    <!-- About -->
    <section
      id="about"
      class="page-shell py-10 sm:py-14"
      :class="{ 'border-t border-slate-200': newArrivals.length }"
    >
      <div class="grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <p class="eyebrow">About us</p>
          <h2 class="section-title mt-1.5">A shop built around the table</h2>
          <p class="mt-4 leading-relaxed text-slate-600">
            The Outpost Games is a welcoming place for players of every game we carry to connect,
            compete, and grow together. We keep prices fair, the play area clean and comfortable,
            and the staff happy to help — whether you're building your first deck or chasing a
            top-eight finish.
          </p>
        </div>
        <ul class="grid grid-cols-2 gap-x-4 gap-y-6">
          <li v-for="offer in OFFERINGS" :key="offer.title">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-outpost-gold/15 text-outpost-gold-text"
            >
              <component :is="offer.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <p class="mt-2.5 font-semibold text-slate-800">{{ offer.title }}</p>
            <p class="mt-0.5 text-sm leading-snug text-slate-600">{{ offer.body }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- Community -->
    <section class="page-shell pb-10 sm:pb-14">
      <div
        class="grid items-center gap-6 rounded-3xl bg-outpost-navy p-6 text-white sm:p-10 md:grid-cols-[1fr_auto]"
      >
        <div>
          <p class="text-xs font-semibold tracking-[0.16em] text-outpost-gold uppercase">
            Community
          </p>
          <h2 class="mt-1.5 font-display text-2xl font-bold sm:text-3xl">Find us online</h2>
          <p class="mt-2 max-w-lg text-slate-300">
            Event sign-ups, pairings, restock alerts, and pull celebrations — every one of our
            channels is on our Linktree.
          </p>
        </div>
        <SocialLinks dark />
      </div>
    </section>

    <!-- Visit -->
    <section id="contact" class="border-t border-slate-200 bg-white py-10 sm:py-14">
      <div class="page-shell grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <p class="eyebrow">Visit</p>
          <h2 class="section-title mt-1.5">Come play</h2>
          <p class="mt-4 text-sm text-slate-700"><StoreStatus /></p>
          <address class="mt-4 text-lg leading-relaxed text-slate-800 not-italic">
            {{ STORE_INFO.address.line1 }}<br />
            {{ STORE_INFO.address.city }}, {{ STORE_INFO.address.state }}
            {{ STORE_INFO.address.zip }}
          </address>
          <div class="mt-6 grid grid-cols-2 gap-3 sm:flex">
            <a
              :href="STORE_INFO.mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary py-3"
            >
              <MapPinIcon class="h-5 w-5" aria-hidden="true" />
              Directions
            </a>
            <a :href="`mailto:${STORE_INFO.email}`" class="btn-secondary py-3">
              <EnvelopeIcon class="h-5 w-5" aria-hidden="true" />
              Email us
            </a>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200">
          <h3 class="flex items-center gap-2 px-5 pt-5 font-semibold text-slate-800">
            <ClockIcon class="h-5 w-5 text-slate-400" aria-hidden="true" />
            Hours
          </h3>
          <dl class="mt-3 divide-y divide-slate-100 text-sm">
            <div
              v-for="day in HOURS_BY_DAY"
              :key="day.day"
              class="flex items-center justify-between px-5 py-3"
              :class="day.jsDay === todayJsDay ? 'bg-outpost-gold/10 font-semibold' : ''"
            >
              <dt class="flex items-center gap-2 text-slate-800">
                {{ day.name }}
                <span
                  v-if="day.jsDay === todayJsDay"
                  class="rounded-full bg-outpost-navy px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase"
                >
                  Today
                </span>
              </dt>
              <dd :class="day.isOpen ? 'text-slate-800' : 'text-slate-400'">{{ day.label }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNow } from '@vueuse/core'
import {
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TrophyIcon,
  HeartIcon,
  SparklesIcon,
  UserGroupIcon,
  TagIcon,
} from '@heroicons/vue/24/outline'
import badgeUrl from '../assets/outpost-badge.webp'
import StoreStatus from '../components/StoreStatus.vue'
import SectionHeading from '../components/SectionHeading.vue'
import AgendaList from '../components/AgendaList.vue'
import ProductCard from '../components/ProductCard.vue'
import SocialLinks from '../components/SocialLinks.vue'
import { useEventsStore } from '../stores/events'
import { useWeeklyOverridesStore } from '../stores/weeklyOverrides'
import { useSquareCatalogStore, slugify } from '../stores/squareCatalog'
import { STORE_INFO, HOURS_BY_DAY } from '../config/storeInfo'
import { WEEKLY_SCHEDULE } from '../config/weeklySchedule'
import { gameMeta, HEADLINE_GAMES } from '../config/games'
import { PRODUCTS_CATALOG_LIVE } from '../config/featureFlags'
import { getAgenda } from '../utils/eventOccurrences'
import { getStoreClock } from '../utils/eventDateTime'
import { scrollToSectionId, cancelPendingSectionScroll } from '../utils/scrollToSection'
import { usePageMeta } from '../composables/usePageMeta'

usePageMeta({
  title: 'The Outpost Games — TCG Shop in Rio Grande City, TX',
  description:
    'Your local card game shop for Magic: The Gathering, Pokémon, One Piece, Gundam, and Riftbound in Rio Grande City, Texas. Weekly tournaments, singles, sealed product, and a community that plays together.',
  path: '/',
})

const route = useRoute()
const eventsStore = useEventsStore()
const weeklyOverridesStore = useWeeklyOverridesStore()
const catalogStore = useSquareCatalogStore()

const now = useNow({ interval: 60_000 })
const todayJsDay = computed(() => getStoreClock(now.value).jsDay)

// ── This week ────────────────────────────────────────────────────────────────
const eventsLoading = computed(() => eventsStore.loading || weeklyOverridesStore.loading)
// A failed overrides fetch would otherwise advertise weekly nights that were
// cancelled for a date, so the agenda waits on it rather than guessing.
const agenda = computed(() =>
  weeklyOverridesStore.error
    ? []
    : getAgenda(eventsStore.upcomingEvents, WEEKLY_SCHEDULE, weeklyOverridesStore.overrides, {
        days: 7,
        now: now.value,
      })
)

// ── Shop by game ─────────────────────────────────────────────────────────────
// Live sections when the catalog has stock; otherwise the headline games, all
// pointing at /products (which explains the empty state itself).
const gameTiles = computed(() =>
  catalogStore.sections.length
    ? catalogStore.sections.map(section => {
        const meta = gameMeta(section.slug, section.name)
        return {
          slug: section.slug,
          to: `/products/${section.slug}`,
          label: meta.label,
          accent: meta.accent,
          count: section.items.length,
        }
      })
    : HEADLINE_GAMES.map(game => ({
        slug: game.slug,
        to: '/products',
        label: game.label,
        accent: game.accent,
        count: 0,
      }))
)

// Newest first, preferring items that have a photo — a row of placeholder
// tiles is a weak first impression, and plenty of Square items lack images.
const newArrivals = computed(() => {
  const withPhotos = catalogStore.newest.filter(item => item.imageUrl)
  return (withPhotos.length >= 4 ? withPhotos : catalogStore.newest).slice(0, 10)
})

// ── About ────────────────────────────────────────────────────────────────────
const OFFERINGS = [
  {
    icon: Squares2X2Icon,
    title: 'Sealed & singles',
    body: 'Booster boxes, decks, and singles across every game we carry.',
  },
  {
    icon: TrophyIcon,
    title: 'Weekly tournaments',
    body: 'League nights, Friday Night Magic, and special events.',
  },
  {
    icon: HeartIcon,
    title: 'Every game, every age',
    body: 'We strive to carry as many games as we can, and our tables are open to any game and players of every age.',
  },
  {
    icon: UserGroupIcon,
    title: 'Room to play',
    body: 'A clean, spacious play area with plenty of tables.',
  },
  {
    icon: SparklesIcon,
    title: 'Friendly staff',
    body: 'Knowledgeable folks who are happy to teach and talk shop.',
  },
  { icon: TagIcon, title: 'Fair pricing', body: 'Competitive prices on everything in the case.' },
]

onMounted(() => {
  eventsStore.fetchEvents()
  weeklyOverridesStore.fetchOverrides()
  if (PRODUCTS_CATALOG_LIVE) catalogStore.ensureCatalog()
})

onUnmounted(() => {
  // A hash-scroll chain started on mount can still be pending when the
  // visitor navigates away — leaving it running would scroll the page they
  // just landed on.
  cancelPendingSectionScroll()
})

// Arriving at '/' with a hash already set (cross-route section nav via
// useSectionNav, or a direct link like /#contact) — scroll to it once
// mounted. The retry/cancellation rationale lives in scrollToSection.ts.
if (route.hash) {
  const targetId = route.hash.slice(1)
  nextTick(() => scrollToSectionId(targetId))
}
</script>
