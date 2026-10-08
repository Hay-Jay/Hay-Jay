/** Tiny WebAudio synth for UI sounds (no asset downloads). Lazily created on first user gesture. */
export class Audio {
  constructor(getVolume) { this.ctx = null; this.getVolume = getVolume; this.ring = null; }
  _c() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (this.ctx.state === 'suspended') this.ctx.resume?.(); return this.ctx; }
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
  startRing() { this.stopRing(); const r = () => { this.tone(740, 0.18, { type: 'triangle' }); this.tone(988, 0.18, { type: 'triangle', delay: 0.22 }); }; r(); this.ring = setInterval(r, 1800); }
  stopRing() { clearInterval(this.ring); this.ring = null; }
}
