/**
 * Real-money surfaces for the game's owner (docs/AMAZING.md section 6). No payment code runs in the game, ever: an advertiser or a supporter deals with
 * the owner outside the game (an invoice, a payment link, a support page), and the owner records the result here and redeploys. Real money never
 * enters a player's wallet and never buys anything in play (VISION 6.1).
 *
 * Until the owner fills CONTACT_URL, the Advertise page says "Booking opens soon" and shows no contact; until SUPPORT_URL is set, there is no Support
 * button. Both must be the owner's own pages (A1, A2 in docs/AMAZING.md).
 */
export const CONTACT_URL = '';
export const SUPPORT_URL = '';

/** The sponsored product, from VISION 6.2: Canadian dollars per 7 days, a share of a board's rotation, an image or a line of text plus a link. */
export const SPONSOR_TIERS = [
  { id: 'standard', name: 'Roadside board', cad: 25, boards: 'Any of the standard boards along downtown streets', share: 'One of up to 4 ads in rotation' },
  { id: 'big', name: 'Big board', cad: 50, boards: 'The big screens on the arterials and the gateways', share: 'One of up to 3 ads in rotation' },
  { id: 'landmark', name: 'Landmark board', cad: 100, boards: 'The landmark screens by Wascana and the stadium', share: 'One of up to 2 ads in rotation' },
];

/**
 * Booked sponsored ads, added by the owner after the advertiser paid and the creative was reviewed. Shape (all required unless noted):
 *   { id: 'sp_001', board: '<board id from data/billboards.js>', business: 'Real Business Name', text: 'Up to 40 characters', url: 'https://...',
 *     theme: '<a THEMES key>', from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' (inclusive, Regina dates), founding: true (optional: shows a Founding sponsor badge) }
 * core/sponsors.js validates every row (https only, known board and theme, sane dates, no IP hosts); a bad row is ignored, never shown.
 */
export const SPONSORED = [];

/** The Supporters' Mural in Victoria Park: names supporters asked to be listed under, with their consent. { name: 'Display name', since: 'YYYY-MM' } */
export const SUPPORTERS = [];
