/**
 * Regina residents you can befriend by @username. They are ALL NPCs (clearly labelled in the UI): real player
 * friends arrive with the multiplayer server milestone and will use the same @username lookup.
 */
export const RESIDENTS = [
  { id: 'tobi',  handle: '@tobi.rgn',        name: 'Tobi Adeyemi',     emoji: '🎧', color: '#ff8a5c', job: 'Barista, Cathedral Village', bio: 'Pulls the best espresso on 13th Ave. Plays bass in a band that has never played a gig.', likes: ['coffee', 'pop'], datable: true,
    lines: ['Did you know a double-double is basically a personality?', 'Our band finally has a name. We argue about it daily.', 'Come by the café — first one is on me. (Second one is not.)'] },
  { id: 'priya', handle: '@priya_runs',      name: 'Priya Sharma',     emoji: '🏃', color: '#3bd6c6', job: 'Nurse, runs Wascana loop', bio: 'Night-shift nurse. Runs the Wascana loop at dawn. Will absolutely make you stretch.', likes: ['apple', 'milk'], datable: true,
    lines: ['Hydrate! Seriously. Hydrate.', 'I did the full Wascana loop before sunrise. The geese were judging me.', 'Gym later? I will spot you.'] },
  { id: 'jess',  handle: '@jess.thunder',    name: 'Jess Lafontaine',  emoji: '🏒', color: '#2ea86a', job: 'Hockey referee', bio: 'Referees by night, Rider Nation by Saturday. Loud. Loyal. Green and white.', likes: ['chips', 'pop'], datable: true,
    lines: ['That was NOT icing. I will die on this hill.', 'Rider game on Saturday? You are coming. Not a question.', 'Bring ketchup chips. Obviously.'] },
  { id: 'omar',  handle: '@omar_builds',     name: 'Omar Haddad',      emoji: '🔧', color: '#c98a3c', job: 'Carpenter', bio: 'Builds decks, fixes doors, collects tape measures. Has opinions about every staircase in Regina.', likes: ['sandwich', 'coffee'], datable: false,
    lines: ['Measure twice. Cut once. Complain about the weather always.', 'Need a bookshelf? I know a guy. The guy is me.', 'Your door sticks? Classic prairie humidity.'] },
  { id: 'kaya',  handle: '@kaya.sky',        name: 'Kaya Whitebear',   emoji: '🎨', color: '#b077e8', job: 'Muralist', bio: 'Paints big skies on bigger walls. If you see a mural of a meadowlark downtown, that was her.', likes: ['bannock', 'apple'], datable: true,
    lines: ['The light on the prairie at 5 pm is unfair to other places.', 'New mural going up on Scarth. I will need a ladder holder.', 'Color is a decision. Make a bold one.'] },
  { id: 'liam',  handle: '@liam_oh_eh',      name: "Liam O'Brien",     emoji: '🎣', color: '#4f9bd9', job: 'Wildlife tech', bio: 'Tells fishing stories where the fish gets bigger every retelling. Eh?', likes: ['sandwich', 'chips'], datable: false,
    lines: ['This one was THIS big. (Gestures wildly.)', 'Pickerel season soon. I have a spot. It is a secret. It is in Qu\'Appelle.', 'Dress warm. Then dress warmer. Then ice-fish.'] },
  { id: 'mei',   handle: '@mei.bakes',       name: 'Mei Chen',         emoji: '🥐', color: '#ffb347', job: 'Baker', bio: 'Up at 4 am for sourdough. Believes bannock and bao can be friends.', likes: ['bread', 'bannock'], datable: true,
    lines: ['Proofing times are a lifestyle.', 'I made too much bannock again. Come take some.', 'Sourdough starter named Gordon is thriving.'] },
  { id: 'diego', handle: '@diego.dj',        name: 'Diego Morales',    emoji: '🎛️', color: '#ff5a8a', job: 'Radio DJ', bio: 'Late-night host on local radio. Plays what he wants and says it\'s curated.', likes: ['coffee', 'pop'], datable: true,
    lines: ['This next one is for everyone stuck in a snowbank tonight.', 'Request line is open. Do not request that song.', 'Static is just the prairie wind talking.'] },
  { id: 'hannah',handle: '@hannah.reads',    name: 'Hannah Peters',    emoji: '📚', color: '#7a8ee8', job: 'Librarian', bio: 'Will recommend a book you did not know you needed. Shushes with love.', likes: ['milk', 'apple'], datable: true,
    lines: ['Read anything good lately? Please say yes.', 'The library has free events. Free! The best word.', 'I found the perfect cozy winter book for you.'] },
  { id: 'sam',   handle: '@sam_snowplow',    name: 'Sam Kowalchuk',    emoji: '🚜', color: '#e0643a', job: 'Plow driver', bio: 'Clears Regina\'s streets at 3 am. Dad jokes included at no extra charge.', likes: ['coffee', 'sandwich'], datable: false,
    lines: ['Why did the farmer win an award? Outstanding in his field.', 'It is going to dump overnight. I am already caffeinated.', 'Wave when you see the plow. We love that.'] },
  { id: 'aisha', handle: '@aisha.codes',     name: 'Aisha Bello',      emoji: '💻', color: '#36c2a0', job: 'CS student, U of R', bio: 'Debugging at 2 am. Fuelled by cream soda and spite.', likes: ['pop', 'chips'], datable: true,
    lines: ['It works on my machine. It always works on my machine.', 'Midterms. Send snacks. And courage.', 'I built a thing that tracks the sunset. It is always right.'] },
  { id: 'marc',  handle: '@marc.gardens',    name: 'Marc Tremblay',    emoji: '🌱', color: '#6ccf5d', job: 'Gardener, Wascana Centre', bio: 'Grows tulips that outlast the late-May frost. Talks to plants. Plants listen.', likes: ['apple', 'bread'], datable: true,
    lines: ['Tulips are a bet against the weather. I like those odds.', 'Compost is just patience with extra steps.', 'The geese are back. I have opinions.'] },
];
export const RES_BY_ID = Object.fromEntries(RESIDENTS.map((r) => [r.id, r]));
export const normalizeHandle = (q) => String(q ?? '').trim().toLowerCase().replace(/^@/, '');
/** Find by exact handle (with or without @) or id. */
export const findResident = (q) => { const n = normalizeHandle(q); return RESIDENTS.find((r) => r.id === n || normalizeHandle(r.handle) === n) ?? null; };
export const searchResidents = (q) => { const n = normalizeHandle(q); if (!n) return []; return RESIDENTS.filter((r) => normalizeHandle(r.handle).includes(n) || r.name.toLowerCase().includes(n)).slice(0, 6); };

/** Personality reply: keyword intents first, then one of the resident's own lines (stable per message). */
export function residentReply(res, text, level = 0) {
  const t = text.toLowerCase(), has = (...w) => w.some((x) => t.includes(x));
  if (has('hi', 'hey', 'hello', 'yo ')) return level >= 50 ? `${res.emoji} Hey you! Was literally about to text.` : `${res.emoji} Hey! Good to hear from you.`;
  if (has('coffee', 'cafe', 'café')) return 'Coffee? Always. Use the Social app and pick a spot.';
  if (has('gym', 'workout', 'run')) return 'A workout sounds good. Tap "Hang out" and pick the gym.';
  if (has('date', 'dinner', 'love')) return !res.datable ? 'You are a great friend — let\'s keep it that way. 😊' : level >= 60 ? 'Okay, now you are making me blush. 😊' : 'Aww. Let\'s hang out a bit more first, eh?';
  if (has('thanks', 'thank you')) return 'Anytime. That\'s what friends are for.';
  let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `${res.emoji} ${res.lines[h % res.lines.length]}`;
}
