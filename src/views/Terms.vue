<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-4">
      <div class="max-w-4xl mx-auto">
        <h1 class="font-cinzel text-4xl font-bold text-center mb-4 text-gray-800">
          Terms &amp; Conditions
        </h1>
        <p class="text-center text-sm text-gray-500 mb-12">Last updated July 11, 2026</p>

        <div class="card space-y-8">
          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">1. Acceptance of Terms</h2>
            <p class="text-gray-600">
              By accessing or using this website, you agree to be bound by these Terms &amp;
              Conditions. If you do not agree, please do not use this site.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">2. Use of This Website</h2>
            <p class="text-gray-600">
              This site is provided to share information about The Outpost Games, including our
              product catalog, events calendar, and store details. It is informational — purchases
              are not completed directly on this website today. We may introduce online ordering in
              the future, at which point these Terms will be updated accordingly.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">
              3. Product &amp; Inventory Information
            </h2>
            <p class="text-gray-600">
              Product listings, pricing, and stock levels shown on this site — including any
              information sourced from our point-of-sale/inventory systems — are provided for
              convenience and may not always reflect real-time availability. Nothing displayed here
              constitutes a binding offer to sell; all sales are subject to confirmation in-store or
              through the third-party platform where the purchase is made.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">
              4. Third-Party Links &amp; Services
            </h2>
            <p class="text-gray-600">
              This site links to and may display data from third-party platforms, including
              TCGPlayer, Facebook, Discord, and Google Maps. We don't control these services and
              aren't responsible for their content, availability, or policies. Use of any
              third-party platform is governed by that platform's own terms.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">
              5. Intellectual Property
            </h2>
            <p class="text-gray-600 mb-3">
              Site content, branding, and design belong to The Outpost Games unless otherwise noted.
            </p>
            <p class="text-gray-500 text-sm leading-relaxed">
              This website is unofficial Fan Content permitted under the Fan Content Policy. Not
              approved/endorsed by Wizards. Portions of the materials used are property of Wizards
              of the Coast. ©Wizards of the Coast LLC.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">
              6. Disclaimer &amp; Limitation of Liability
            </h2>
            <p class="text-gray-600">
              This website is provided "as is" without warranties of any kind. To the fullest extent
              permitted by law, The Outpost Games is not liable for any damages arising from your
              use of this site or reliance on information presented here.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">
              7. Changes to These Terms
            </h2>
            <p class="text-gray-600">
              We may update these Terms from time to time. Continued use of the site after changes
              are posted means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">8. Governing Law</h2>
            <p class="text-gray-600">
              These Terms are governed by the laws of the State of Texas, without regard to its
              conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 class="font-cinzel text-xl font-bold mb-2 text-gray-800">9. Contact Us</h2>
            <p class="text-gray-600">
              Questions about these Terms? Reach us at
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageMeta } from '../composables/usePageMeta'

usePageMeta({
  title: 'Terms of Service — The Outpost Games',
  description: 'Terms of service for The Outpost Games website and in-store purchases.',
  path: '/terms',
})
</script>
