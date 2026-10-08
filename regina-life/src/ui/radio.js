import { STATIONS, STATION_BY_ID, trackTitle, barPlan, midiToFreq } from '../data/radio.js';

/** Generative radio on WebAudio. Music is synthesised live; the "talk" station uses the browser's speech voice. */
export class Radio {
  constructor(audio, { getNews, onChange } = {}) {
    this.audio = audio; this.getNews = getNews; this.onChange = onChange; this.station = null; this.volume = 0.7;
    this.timer = null; this.bar = 0; this.nextBar = 0; this.track = 0; this.nowTitle = ''; this.master = null; this.noiseBuf = null; this.speechT = 0; this.rnd = Math.random;
  }
  get playing() { return !!this.station; }
  get speechOk() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'; }
  _ctx() { return this.audio._c(); }
  play(id) {
    const st = STATION_BY_ID[id]; if (!st) return false; this.stop(true);
    this.station = id; this.track = Math.floor(Math.random() * 20); this.nowTitle = trackTitle(id, this.track); this.bar = 0;
    if (id === 'talk') { this.nowTitle = this.speechOk ? 'Headlines' : 'Speech not available in this browser'; this.speechT = 0; this.timer = setInterval(() => this._talkTick(), 1000); }
    else {
      const c = this._ctx(); if (!c) { this.station = null; return false; }
      this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = id === 'lofi' ? 3800 : 9000; this.master.disconnect(); this.master.connect(lp); lp.connect(c.destination); this.lp = lp;
      if (!this.noiseBuf) { const len = c.sampleRate; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      this.nextBar = c.currentTime + 0.1; this.timer = setInterval(() => this._schedule(), 120);
    }
    this.onChange?.(); return true;
  }
  stop(silent = false) {
    clearInterval(this.timer); this.timer = null;
    if (this.master) { try { const c = this.audio.ctx; this.master.gain.cancelScheduledValues(c.currentTime); this.master.gain.setTargetAtTime(0, c.currentTime, 0.05); const m = this.master, l = this.lp; setTimeout(() => { try { m.disconnect(); l?.disconnect(); } catch {} }, 400); } catch {} this.master = null; }
    if (this.speechOk) try { speechSynthesis.cancel(); } catch {}
    this.station = null; if (!silent) this.onChange?.();
  }
  setVolume(v) { this.volume = v; }
  _level() { return Math.max(0, Math.min(1, this.audio.getVolume() * this.volume)); }
  _talkTick() {
    if (!this.speechOk || !this.station) return; this.speechT++;
    if (this.speechT % 14 !== 1 || speechSynthesis.speaking) return;
    const news = this.getNews?.() ?? [], it = news[Math.floor(this.speechT / 14) % Math.max(1, news.length)]; if (!it) return;
    const u = new SpeechSynthesisUtterance(`${it.title}. ${it.body}`); u.volume = this._level(); u.rate = 1; u.pitch = 0.95; u.lang = 'en-CA';
    this.nowTitle = it.title; this.onChange?.(); try { speechSynthesis.speak(u); } catch {}
  }
  /* ---- synthesis ---- */
  _env(c, node, t, a, d, peak) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(g); g.connect(this.master); return g; }
  _tone(c, freq, t, dur, { type = 'triangle', peak = 0.1, a = 0.01, filter = null } = {}) {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); let src = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = filter.type; f.frequency.value = filter.f; f.Q.value = filter.q ?? 1; o.connect(f); src = f; }
    this._env(c, src, t, a, dur, peak); o.start(t); o.stop(t + a + dur + 0.05);
  }
  _noise(c, t, dur, { f = 6000, type = 'highpass', peak = 0.05 } = {}) {
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; s.connect(fl); this._env(c, fl, t, 0.002, dur, peak); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  _kick(c, t) { const o = c.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); this._env(c, o, t, 0.003, 0.2, 0.28); o.start(t); o.stop(t + 0.25); }
  _event(c, st, t, ev, beat) {
    const [, kind, v] = ev, sw = st.id === 'jazz' ? 1 : 0;
    switch (kind) {
      case 'pad': for (const n of v.notes) this._tone(c, midiToFreq(v.root + 12 + n), t, beat * 3.6, { type: 'triangle', peak: 0.035, a: 0.25, filter: { type: 'lowpass', f: 1100 } }); break;
      case 'kick': this._kick(c, t); break;
      case 'snare': this._noise(c, t, 0.12, { f: st.id === 'country' ? 2600 : 1800, type: 'bandpass', peak: st.id === 'country' ? 0.05 : 0.09 }); break;
      case 'hat': this._noise(c, t, 0.04, { f: 7500, peak: 0.03 * v }); break;
      case 'ride': this._noise(c, t, 0.14, { f: 6500, peak: 0.035 * v }); break;
      case 'strum': v.notes.forEach((n, i) => this._tone(c, midiToFreq(v.root + 12 + n), t + i * 0.012, beat * 0.9, { type: 'sawtooth', peak: 0.03, a: 0.004, filter: { type: 'bandpass', f: 1400, q: 0.9 } })); break;
      case 'bass': this._tone(c, midiToFreq(v), t, beat * 0.85, { type: st.id === 'jazz' ? 'sine' : 'triangle', peak: st.id === 'jazz' ? 0.16 : 0.13, a: 0.005 }); break;
      case 'twang': this._tone(c, midiToFreq(v), t, beat * 0.5, { type: 'sawtooth', peak: 0.04, a: 0.003, filter: { type: 'bandpass', f: 2200, q: 2 } }); break;
      case 'lead': this._tone(c, midiToFreq(v), t, beat * (st.id === 'lofi' ? 1.1 : 0.6), { type: st.id === 'jazz' ? 'sine' : 'triangle', peak: st.id === 'jazz' ? 0.07 : 0.05, a: 0.02, filter: { type: 'lowpass', f: 2600 } }); break;
      case 'comp': for (const n of v.notes) this._tone(c, midiToFreq(v.root + 12 + n), t, beat * 0.6, { type: 'sine', peak: 0.035, a: 0.01 }); break;
    }
    void sw;
  }
  _schedule() {
    const c = this.audio.ctx; if (!c || !this.station || !this.master) return;
    this.master.gain.setTargetAtTime(this._level() * 0.9, c.currentTime, 0.1);
    const st = STATION_BY_ID[this.station], beat = 60 / st.bpm;
    while (this.nextBar < c.currentTime + 0.5) {
      const plan = barPlan(st.id, this.bar, this.rnd);
      for (const ev of plan) { let off = ev[0]; if (st.id === 'jazz' && off % 1 === 0.5) off += beat * 0.1 / beat; const swing = st.id === 'lofi' && ev[1] === 'hat' && (ev[0] * 2) % 2 === 1 ? 0.06 : 0; this._event(c, st, this.nextBar + off * beat + swing, ev, beat); }
      if (st.id === 'lofi' && this.bar % 2 === 0) this._noise(c, this.nextBar, beat * 8, { f: 1800, type: 'highpass', peak: 0.006 }); // vinyl hiss
      this.nextBar += beat * 4; this.bar++;
      if (this.bar % 16 === 0) { this.track++; this.nowTitle = trackTitle(st.id, this.track); this.onChange?.(); }
    }
  }
}
export { STATIONS };
