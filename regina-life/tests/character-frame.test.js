import { describe, it, expect } from 'vitest';
import { buildCharacter } from '../src/player/character.js';
import { DEFAULT_LOOK, FRAMES, FRAME_PRESET, HAIR_STYLES, LIP_COLORS, CLOTHES, STARTER_WARDROBE } from '../src/data/catalog.js';
import { outfitForTemp } from '../src/world/npcs.js';
import { mulberry32 } from '../src/core/rng.js';

const width = (ch) => { ch.root.updateMatrixWorld(true); const xs = ch.legs.map((l) => l.hip.getWorldPosition(l.hip.position.clone()).x); return Math.abs(xs[0] - xs[1]); };

describe('male / female frame', () => {
  it('every frame has a preset that only sets known values', () => {
    for (const f of FRAMES) { const p = FRAME_PRESET[f]; expect(HAIR_STYLES).toContain(p.hair); expect(LIP_COLORS[p.lips]).toBeTruthy(); }
    expect(FRAMES).toContain(DEFAULT_LOOK.frame);
  });
  it('builds both frames with every hair style, and the female frame has wider hips', () => {
    for (const frame of FRAMES) for (const hair of HAIR_STYLES) { const ch = buildCharacter({ ...DEFAULT_LOOK, frame, hair }); expect(ch.root.children.length).toBeGreaterThan(0); ch.dispose(); }
    const m = buildCharacter({ ...DEFAULT_LOOK, frame: 'male' }), f = buildCharacter({ ...DEFAULT_LOOK, frame: 'female' });
    expect(width(f)).toBeGreaterThan(width(m)); m.dispose(); f.dispose();
  });
  it('a starter skirt is in every wardrobe and draws', () => {
    expect(STARTER_WARDROBE).toContain('skirt_denim');
    const ch = buildCharacter({ ...DEFAULT_LOOK, frame: 'female', bottom: 'skirt_denim' }); expect(ch.root.children.length).toBeGreaterThan(0); ch.dispose();
  });
  it('female NPC outfits only use catalog items', () => {
    for (const t of [-30, -10, 3, 12, 25]) for (let k = 0; k < 6; k++) for (const id of Object.values(outfitForTemp(t, mulberry32(t * 7 + k), true))) expect(CLOTHES[id]).toBeTruthy();
  });
});
