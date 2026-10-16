// The public site's own address, for links the API hands out (share pages,
// calendar files, where Square sends a buyer back to after checkout).
export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://outpostgamesrgv.com').replace(
  /\/$/,
  ''
)
