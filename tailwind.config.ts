/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The Outpost Games brand colors
        'outpost-gold': '#D4AF37',
        'outpost-gold-light': '#E6C85C',
        'outpost-gold-dark': '#B8962E',
        'outpost-navy': '#16304A',
        'outpost-navy-light': '#1B3A52',
        'outpost-navy-dark': '#0F2436',
        'outpost-stone': '#5A5A5A',
        'outpost-stone-light': '#737373',
        'outpost-stone-dark': '#3D3D3D',
        'outpost-black': '#0D0D0D',
        // Lorwyn Eclipsed color palette
        'lorwyn-teal': '#4ECDC4',
        'lorwyn-teal-dark': '#3BA39E', 
        'lorwyn-gold': '#F4D03F',
        'lorwyn-gold-dark': '#D4B429',
        'lorwyn-lavender': '#B8A8E8',
        'lorwyn-lavender-dark': '#9B88D1',
        'lorwyn-sage': '#A7C27F',
        'lorwyn-sage-dark': '#8BA567',
        'lorwyn-silver': '#C4C4C4',
        'lorwyn-silver-dark': '#A8A8A8',
        'lorwyn-midnight': '#2C3E50',
        'lorwyn-midnight-light': '#34495E',
        // MTG mana colors
        'mtg-white': '#FFFBD5',
        'mtg-blue': '#0E68AB',
        'mtg-black': '#150B00',
        'mtg-red': '#D3202A',
        'mtg-green': '#00733E',
      },
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'crimson': ['Crimson Text', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'card-hover': 'cardHover 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        cardHover: {
          '0%': { transform: 'scale(1) rotateY(0deg)' },
          '100%': { transform: 'scale(1.05) rotateY(5deg)' },
        },
      },
    },
  },
  plugins: [],
}