/** FNV-1a: a stable 32-bit seed from a string (a Regina day key, an id). */
export const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
/** Small seeded PRNG so the city generates identically every load. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a0, b0) => a0 + r() * (b0 - a0);
  r.int = (a0, b0) => Math.floor(a0 + r() * (b0 - a0 + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}
