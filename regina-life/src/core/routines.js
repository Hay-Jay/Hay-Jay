/**
 * Who is where right now (docs/AMAZING.md G12). Pure: a resident's routine row, the Regina weekday and hour, and the weather.
 * Every resident is an NPC and is always labelled so in the UI.
 */
import { ROUTINES, RES_BY_ID } from '../data/residents.js';

const OUTDOOR = new Set(['victoriapark', 'scarth', 'wascana', 'leg', 'bridge']);
const WET = new Set(['rain', 'snow', 'storm']);
/** { weekday: 0 Sun..6 Sat, hour: 0..23, kind } -> the resident's place id and doing, or null. */
export function whereIs(id, { weekday = 1, hour = 12, kind = 'clear' } = {}) {
  if (hour >= 23 || hour < 6) return null;
  const we = weekday === 0 || weekday === 6;
  for (const [days, h0, h1, place, doing] of ROUTINES[id] ?? []) {
    if ((days === 'wk' && we) || (days === 'we' && !we)) continue;
    if (hour < h0 || hour >= h1) continue;
    if (OUTDOOR.has(place) && WET.has(kind)) return null;   // gone indoors
    return { place, doing };
  }
  return null;
}
/** The residents at a place right now: [{ res, doing }]. */
export function residentsAt(place, when) {
  const out = [];
  for (const id of Object.keys(ROUTINES)) { const w = whereIs(id, when); if (w?.place === place && RES_BY_ID[id]) out.push({ res: RES_BY_ID[id], doing: w.doing }); }
  return out;
}
