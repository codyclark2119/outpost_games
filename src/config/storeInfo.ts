// Single source of truth for store facts — previously duplicated independently
// across Home.vue, About.vue, Contact.vue, and AppFooter.vue.
export const STORE_INFO = {
  name: 'The Outpost Games',
  address: {
    line1: '605 W. Main Street, Suite 4',
    city: 'Rio Grande City',
    state: 'TX',
    zip: '78582',
    full: '605 W. Main Street, Suite 4, Rio Grande City, TX 78582',
  },
  email: 'theoutpostgamingrgv@gmail.com',
  hours: {
    'Mon-Wed': 'Closed',
    Thursday: '5:00 PM - 10:00 PM',
    Friday: '5:00 PM - 10:00 PM',
    Saturday: '5:00 PM - 10:00 PM',
    Sunday: '5:00 PM - 10:00 PM',
  },
  social: {
    facebook: 'https://www.facebook.com/Theoutpostgames/',
    discord: 'https://discord.gg/PW3YkMtFmz',
    instagram: 'https://www.instagram.com/theoutpostgames_rgc',
  },
  mapsUrl: 'https://maps.app.goo.gl/BqKucUkatQgWTmjM7',
}
