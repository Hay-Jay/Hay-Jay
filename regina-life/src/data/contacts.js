/** NPC contacts. Clearly NPCs: real multiplayer messaging arrives with the server milestone. */
export const CONTACTS = {
  dani:    { id: 'dani',    name: 'Dani',                  sub: 'Roommate · NPC',          color: '#ff7a59', kind: 'person' },
  mom:     { id: 'mom',     name: 'Mom',                   sub: 'Family · NPC',            color: '#e0568a', kind: 'person' },
  market:  { id: 'market',  name: 'Prairie Corner Market', sub: 'Employer · NPC',          color: '#3bb273', kind: 'business', place: 'market' },
  threads: { id: 'threads', name: 'Prairie Threads',       sub: 'Employer · NPC',          color: '#8e6bd8', kind: 'business', place: 'threads' },
  bank:    { id: 'bank',    name: 'Wascana Credit Union',  sub: 'Bank · automated NPC',    color: '#2d7ff9', kind: 'business' },
};
export const CONTACT_ORDER = ['dani', 'mom', 'market', 'threads', 'bank'];

/** Tiny keyword responder so NPC chats feel alive and are fully deterministic/testable. */
export function npcReply(contactId, text) {
  const t = text.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (contactId === 'dani') {
    if (has('hi', 'hey', 'hello')) return 'Hey! Just got back from Wascana — the lake looks unreal right now. 🌅';
    if (has('food', 'hungry', 'eat', 'dinner')) return 'Pick up something from Prairie Corner Market? The bannock is amazing.';
    if (has('job', 'work')) return 'Check the Jobs app! The Market is hiring and the pay is decent.';
    if (has('cold', 'weather', 'snow')) return "It's Saskatchewan. Wear the toque. 🥶";
    return 'Ha, fair. Catch you at the apartment later!';
  }
  if (contactId === 'mom') {
    if (has('money', 'broke', 'rent')) return 'Honey, budget first — pay yourself before the weekend. Love you!';
    if (has('hi', 'hey', 'hello')) return 'Hi sweetheart! Are you eating properly?';
    return "That's lovely dear. Dress warm out there!";
  }
  if (contactId === 'market') {
    if (has('job', 'hire', 'work', 'shift')) return 'Apply in the Jobs app and we will get back to you shortly. Shifts run in-store — see you there!';
    return "Prairie Corner Market — open daily. Ask about careers in the Jobs app.";
  }
  if (contactId === 'threads') return 'Thanks for messaging Prairie Threads! Apply via the Jobs app, or drop by to shop.';
  return 'This is an automated message from Wascana Credit Union. Never share your PIN.';
}
