/** Tiny WebAudio synth for UI sounds (no asset downloads). Lazily created on first user gesture. */
export class Audio {
  constructor(getVolume) { this.ctx = null; this.getVolume = getVolume; this.ring = null; }
  _c() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') { try { this.ctx.resume?.()?.catch?.(() => {}); } catch {} } return this.ctx; }
  tone(freq, dur = 0.12, { type = 'sine', gain = 0.14, delay = 0, slide = 0 } = {}) {
    const c = this._c(); if (!c) return; const v = this.getVolume(); if (v <= 0) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  blip(kind) {
    switch (kind) {
      case 'notify': this.tone(880, 0.12, { type: 'triangle' }); this.tone(1320, 0.16, { type: 'triangle', delay: 0.1 }); break;
      case 'ok': this.tone(660, 0.09, { type: 'triangle' }); this.tone(990, 0.12, { type: 'triangle', delay: 0.07 }); break;
      case 'cash': this.tone(1200, 0.08, { type: 'square', gain: 0.07 }); this.tone(1600, 0.2, { type: 'square', gain: 0.07, delay: 0.08 }); break;
      case 'error': this.tone(220, 0.18, { type: 'sawtooth', gain: 0.08 }); break;
      case 'tick': this.tone(1800, 0.03, { type: 'square', gain: 0.05 }); break;
      case 'shutter': this.tone(2400, 0.04, { type: 'square', gain: 0.06 }); this.tone(900, 0.09, { type: 'square', gain: 0.05, delay: 0.05 }); break;
      case 'swipe': this.tone(420, 0.1, { type: 'sine', slide: 2.2, gain: 0.07 }); break;
      default: this.tone(700, 0.06);
    }
  }
  /**
   * Juice sounds (docs/AMAZING.md D6). Pitch-jittered so repeats never grate: a rising chime for anything you gain, a soft falling one for a cost,
   * a coin sparkle, a little fanfare for firsts and milestones, and a material thud when furniture lands (noise through a band-pass + a low sine).
   */
  chime(kind = 'gain') {
    const j = () => 1 + (Math.random() - 0.5) * 0.06, P = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];   // C major pentatonic
    switch (kind) {
      case 'gain': { const b = Math.floor(Math.random() * 2); [0, 2, 4].forEach((k, i) => this.tone(P[b + k] * j(), 0.16, { type: 'triangle', gain: 0.09, delay: i * 0.06 })); break; }
      case 'cost': this.tone(660 * j(), 0.12, { type: 'sine', gain: 0.08 }); this.tone(494 * j(), 0.18, { type: 'sine', gain: 0.07, delay: 0.08 }); break;
      case 'coin': for (let i = 0; i < 4; i++) this.tone((1568 + i * 196) * j(), 0.07, { type: 'triangle', gain: 0.05, delay: i * 0.05 }); break;
      case 'fanfare': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i === 3 ? 0.4 : 0.14, { type: 'triangle', gain: 0.1, delay: i * 0.11 })); this.tone(261.6, 0.5, { type: 'sine', gain: 0.08, delay: 0.33 }); break;
      case 'pop': this.tone(520 * j(), 0.08, { type: 'sine', gain: 0.1, slide: 1.8 }); break;
      default: this.tone(700 * j(), 0.08, { type: 'triangle', gain: 0.08 });
    }
  }
  /** A soft "tock" when a piece lands: wood, fabric, metal, ceramic or leafy (Unpacking-style material foley, synthesised). */
  thud(material = 'wood') {
    const c = this._c(); if (!c) return; const v = this.getVolume(); if (v <= 0) return;
    const M = { wood: [900, 6, 0.16, 140], fabric: [420, 2, 0.12, 95], metal: [2400, 14, 0.1, 220], ceramic: [3000, 10, 0.08, 330], leafy: [1600, 1.5, 0.08, 0] }[material] ?? [900, 6, 0.16, 140];
    const [freq, q, gain, low] = M, t = c.currentTime, len = Math.floor(c.sampleRate * 0.12);
    this._noise ||= (() => { const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); return b; })();
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this._noise; f.type = 'bandpass'; f.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.12); f.Q.value = q;
    g.gain.setValueAtTime(gain * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + 0.13);
    if (low) this.tone(low, 0.12, { type: 'sine', gain: 0.12, slide: 0.6 });
  }
  startRing() { this.stopRing(); const r = () => { this.tone(740, 0.18, { type: 'triangle' }); this.tone(988, 0.18, { type: 'triangle', delay: 0.22 }); }; r(); this.ring = setInterval(r, 1800); }
  stopRing() { clearInterval(this.ring); this.ring = null; }
}
