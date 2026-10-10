import { describe, it, expect } from 'vitest';
import { CollisionGrid } from '../src/world/collision.js';
import { POIS, DISTRICTS, lakePolygon, mapRoads, GRID, PITCH, poiById, ISLAND } from '../src/world/cityData.js';
import { outfitForTemp } from '../src/world/npcs.js';
import { simulateWeather, fetchWeather, WMO } from '../src/core/weather.js';
import { CLOTHES, STARTER_WARDROBE, DEFAULT_LOOK, SLOT_KEY } from '../src/data/catalog.js';
import { mulberry32 } from '../src/core/rng.js';

describe('CollisionGrid', () => {
  it('pushes a circle out of a wall and reports the hit', () => {
    const g = new CollisionGrid(); g.add(0, 0, 10, 10, 5);
    const p = { x: 10.2, z: 5 }; expect(g.resolve(p, 0.5)).toBe(true); expect(p.x).toBeGreaterThanOrEqual(10.5 - 1e-6);
    const q = { x: 20, z: 20 }; expect(g.resolve(q, 0.5)).toBe(false);
  });
  it('ejects a centre trapped inside a rect', () => {
    const g = new CollisionGrid(); g.add(0, 0, 4, 4, 5); const p = { x: 3.9, z: 2 }; g.resolve(p, 0.4); expect(p.x).toBeGreaterThan(4);
  });
  it('detects camera occlusion by a building but not above it', () => {
    const g = new CollisionGrid(); g.add(10, -5, 20, 5, 12);
    expect(g.rayBlocked(0, 1.5, 0, 30, 1.5, 0)).toBeLessThan(0.5);
    expect(g.rayBlocked(0, 40, 0, 30, 40, 0)).toBe(1);
  });
});

describe('City data', () => {
  it('has unique POI ids with finite coordinates', () => {
    const ids = POIS.map((p) => p.id); expect(new Set(ids).size).toBe(ids.length);
    for (const p of POIS) { expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true); }
  });
  it('keeps each district on its real compass bearing from downtown, in a compact ring', () => {
    const d = (id) => DISTRICTS.find((x) => x.id === id);
    expect(d('uofr').x).toBeGreaterThan(0); expect(d('uofr').z).toBeGreaterThan(1500);          // south-east
    expect(d('rochdale').x).toBeLessThan(0); expect(d('rochdale').z).toBeLessThan(-1000);        // north-west
    expect(d('airport').x).toBeLessThan(-2000);                                                   // west
    expect(d('stadium').x).toBeLessThan(-800); expect(d('cathedral').x).toBeLessThan(-800);       // west of downtown
    expect(d('east').x).toBeGreaterThan(1500); expect(d('south').z).toBeGreaterThan(1500);
    for (const x of DISTRICTS) { if (x.detail === 'playable') continue; const r = Math.hypot(x.x, x.z); expect(r, x.id).toBeGreaterThan(900); expect(r, x.id).toBeLessThan(3600); }
  });
  it('every district and place sits on the island', () => {
    for (const x of [...DISTRICTS, ...POIS]) { expect(x.x, x.id).toBeGreaterThan(ISLAND.x0); expect(x.x, x.id).toBeLessThan(ISLAND.x1); expect(x.z, x.id).toBeGreaterThan(ISLAND.z0); expect(x.z, x.id).toBeLessThan(ISLAND.z1); }
  });
  it('lake lies between downtown and the Legislative Building', () => {
    const lz = lakePolygon().map(([, z]) => z); expect(Math.min(...lz)).toBeGreaterThan(GRID.j1 * PITCH); expect(Math.max(...lz)).toBeLessThan(poiById.leg.z);
  });
  it('map roads have two or more points', () => { for (const r of mapRoads()) expect(r.pts.length).toBeGreaterThanOrEqual(2); });
});

describe('Weather-responsive clothing', () => {
  it('dresses warmly in deep cold and lightly in summer', () => {
    const cold = outfitForTemp(-25, mulberry32(1)), hot = outfitForTemp(28, mulberry32(1));
    expect(cold.neck).toBe('scarf_plaid'); expect(CLOTHES[cold.top].style).toBe('jacket'); expect(CLOTHES[cold.shoes].style).toBe('boots');
    expect(CLOTHES[hot.top].style).toBe('tee');
  });
  it('only references catalog items', () => { for (const t of [-30, -10, 3, 12, 25]) for (const id of Object.values(outfitForTemp(t, mulberry32(t + 50)))) expect(CLOTHES[id]).toBeTruthy(); });
  it('starter wardrobe covers every slot so the creator is never empty', () => {
    for (const slot of Object.keys(SLOT_KEY)) expect(STARTER_WARDROBE.some((id) => CLOTHES[id].slot === slot)).toBe(true);
    for (const [slot, key] of Object.entries(SLOT_KEY)) expect(CLOTHES[DEFAULT_LOOK[key]].slot).toBe(slot);
  });
});

describe('Weather provider', () => {
  it('labels fallback data as simulated, never live', async () => {
    const w = await fetchWeather(async () => { throw new Error('offline'); }, new Date('2026-01-15T18:00:00Z'));
    expect(w.live).toBe(false); expect(w.source).toBe('SIMULATED'); expect(w.temp).toBeLessThan(5);
  });
  it('parses a live Open-Meteo payload', async () => {
    const payload = { current: { temperature_2m: -12.4, apparent_temperature: -20, weather_code: 73, cloud_cover: 100, wind_speed_10m: 18, precipitation: 0.4 }, daily: { temperature_2m_max: [-8], temperature_2m_min: [-17] } };
    const w = await fetchWeather(async () => ({ ok: true, json: async () => payload }));
    expect(w.live).toBe(true); expect(w.kind).toBe('snow'); expect(w.temp).toBe(-12); expect(w.hi).toBe(-8);
  });
  it('rejects malformed or error responses', async () => {
    expect((await fetchWeather(async () => ({ ok: false, status: 500 }))).live).toBe(false);
    expect((await fetchWeather(async () => ({ ok: true, json: async () => ({}) }))).live).toBe(false);
  });
  it('simulation is deterministic per day and plausible per season', () => {
    const a = simulateWeather(new Date('2026-07-10T18:00:00Z')), b = simulateWeather(new Date('2026-07-10T18:00:00Z'));
    expect(a).toEqual(b); expect(a.temp).toBeGreaterThan(8);
  });
  it('maps WMO codes', () => { expect(WMO(0).kind).toBe('clear'); expect(WMO(63).kind).toBe('rain'); expect(WMO(95).kind).toBe('storm'); expect(WMO(45).kind).toBe('fog'); });
});
