<template>
  <div class="page-shell max-w-3xl py-10 sm:py-14">
    <h1 class="font-display text-3xl font-bold tracking-tight text-outpost-navy sm:text-4xl">
      Privacy Policy
    </h1>
    <p class="mt-2 mb-8 text-sm text-slate-500">Last updated July 11, 2026</p>

    <div class="card space-y-8">
      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Overview</h2>
        <p class="text-slate-600">
          This page describes how The Outpost Games website handles information. In short: this site
          collects very little. It exists mainly to share our product catalog, events calendar, and
          store details.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Information We Do Not Collect</h2>
        <p class="text-slate-600">
          This site doesn't have user accounts, doesn't process payments or checkout, and doesn't
          run a contact form — our Contact page simply links to our email address and store
          location. Any email you send us goes directly to our inbox and isn't collected or stored
          by this website itself.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Third-Party Services</h2>
        <p class="text-slate-600">
          This site loads fonts from Google Fonts, which may process your IP address to serve font
          files. We also link out to Facebook, Discord, Google Maps, and TCGPlayer — if you follow
          those links, your interactions there are governed by each service's own privacy policy,
          not this one. Our product/inventory display may also be sourced from our Squarespace
          commerce backend, used only to reflect what we sell and have in stock, not to collect
          information about you.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Cookies &amp; Tracking</h2>
        <p class="text-slate-600">
          We don't currently use analytics, advertising, or tracking cookies on this site.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Children's Privacy</h2>
        <p class="text-slate-600">
          This site is not directed at children under 13, and we do not knowingly collect
          information from children.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Changes to This Policy</h2>
        <p class="text-slate-600">
          If how we handle information changes — for example, if we add online checkout in the
          future — we'll update this page to reflect that.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-lg font-semibold text-outpost-navy">Contact Us</h2>
        <p class="text-slate-600">
          Questions about this policy? Reach us at
          <a
            href="mailto:theoutpostgamingrgv@gmail.com"
            class="text-outpost-navy hover:text-outpost-gold"
            >theoutpostgamingrgv@gmail.com</a
          >
          or visit us at 605 W. Main Street, Suite 4, Rio Grande City, TX 78582.
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageMeta } from '../composables/usePageMeta'

usePageMeta({
  title: 'Privacy Policy — The Outpost Games',
  description: 'Privacy policy for The Outpost Games website.',
  path: '/privacy',
})
</script>
