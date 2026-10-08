/** Own-property check: lookups into plain-object tables must never reach Object.prototype ('constructor', '__proto__'…). */
export const own = (o, k) => o != null && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
export const clampNum = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
