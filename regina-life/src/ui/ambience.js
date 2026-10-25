/**
 * The soundscape (docs/AMAZING.md D7): a quiet, procedural bed under the game, built from noise and oscillators like the radio (no audio files).
 *   wind     band-passed noise whose loudness and pitch follow the REAL wind speed
 *   traffic  a low brown-noise hum downtown, softer at night
 *   rain     bright hiss when it rains (none in snow: snow is quiet)
 *   room     a faint low hum indoors (a fridge, a furnace)
 *   life     birds on spring and summer mornings, a chickadee on winter days, crickets on summer nights
 * Silent until the first tap or key (browsers require it), follows the phone's volume, and can be switched off in Settings (settings.ambience).
 */
export class Ambience {
  constructor(audio, { enabled = () => true } = {}) { this.audio = audio; this.enabled = enabled; this.on = false; this.nodes = null; this.st = null; }
  /** Call from any user gesture; safe to call many times. */
  start() {
    if (this.nodes) return; const c = this.audio._c?.(); if (!c) return; this.c = c;
    const buf = (brown) => {
      const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      return b;
    };
    const loop = (b) => { const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s; };
    const white = buf(false), brown = buf(true);
    const master = c.createGain(); master.gain.value = 0; master.connect(c.destination);
    const chain = (src, type, freq, q = 0.7) => { const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(master); return { f, g }; };
    const wind = chain(loop(white), 'bandpass', 420, 0.6), traffic = chain(loop(brown), 'lowpass', 220), rain = chain(loop(white), 'highpass', 1800);
    const hum = c.createOscillator(); hum.frequency.value = 58; const hg = c.createGain(); hg.gain.value = 0; hum.connect(hg).connect(master); hum.start();
    this.nodes = { master, wind, traffic, rain, room: { g: hg } };
    if (this.st) this.update(this.st);
  }
  _ramp(param, v, tc = 1.5) { param.setTargetAtTime(v, this.c.currentTime, tc); }
  /** st = { outdoors, night (0..1), season, hour, kind, wind (km/h), temp, downtown, volume (0..1) }, about once a second. */
  update(st) {
    this.st = st; const n = this.nodes; if (!n) return;
    const on = this.enabled() && st.volume > 0, vol = on ? Math.min(1, st.volume) * 0.9 : 0, out = st.outdoors ? 1 : 0.18;
    this._ramp(n.master.gain, vol, 0.8);
    const w = Math.max(0, Math.min(1, (st.wind ?? 10) / 55));
    this._ramp(n.wind.g.gain, (0.012 + w * 0.06) * out); this._ramp(n.wind.f.frequency, 300 + w * 500, 4);
    this._ramp(n.traffic.g.gain, st.outdoors && st.downtown ? 0.05 * (1 - 0.6 * (st.night ?? 0)) : 0);
    const raining = st.kind === 'rain' || st.kind === 'drizzle' || st.kind === 'storm';
    this._ramp(n.rain.g.gain, raining ? (st.kind === 'drizzle' ? 0.02 : 0.045) * (st.outdoors ? 1 : 0.35) : 0, 2);
    this._ramp(n.room.g.gain, st.outdoors ? 0 : 0.012, 2);
    if (!on || !st.outdoors) return;
    // life: a chance per second, so it never loops
    const morning = st.hour >= 5 && st.hour < 11, day = st.hour >= 7 && st.hour < 19, night = (st.night ?? 0) > 0.7;
    if ((st.season === 'spring' || st.season === 'summer') && (morning ? Math.random() < 0.35 : day && Math.random() < 0.08) && !raining) this.bird();
    if (st.season === 'winter' && day && st.temp > -25 && Math.random() < 0.04) this.chickadee();
    if (st.season === 'summer' && night && st.temp > 12 && Math.random() < 0.5) this.crickets();
  }
  _note(f0, f1, dur, at, gain = 0.03, type = 'sine') {
    const c = this.c, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.nodes.master); o.start(t); o.stop(t + dur + 0.02);
  }
  bird() { const base = 2600 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) this._note(base * (1 + Math.random() * 0.2), base * (1.15 + Math.random() * 0.3), 0.07 + Math.random() * 0.05, i * 0.11, 0.025); }
  /** The black-capped chickadee's "fee-bee": two clear whistles, the second lower (a real Regina winter sound). */
  chickadee() { this._note(4000, 3950, 0.32, 0, 0.022); this._note(3400, 3350, 0.36, 0.42, 0.02); }
  crickets() { for (let i = 0; i < 6; i++) this._note(4600, 4600, 0.03, i * 0.06, 0.008, 'triangle'); }
}
