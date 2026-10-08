/** Unified keyboard / mouse / touch input. Produces a movement vector, look deltas, zoom and edge-triggered actions. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false };
    this.lookDX = 0; this.lookDY = 0; this.zoom = 0;
    this.runToggle = false; this.enabled = true;
    this.handlers = {};
    this.lastLook = performance.now();
    this._pointers = new Map(); this._pinch = 0;
    const isTyping = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      const map = { e: 'interact', f: 'interact', enter: 'interact', p: 'phone', m: 'map', c: 'wardrobe', escape: 'escape', v: 'view', h: 'hud' };
      if (map[k]) this.emit(map[k]);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      canvas.setPointerCapture?.(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      if (this._pointers.size === 2) this._pinch = this._pinchDist();
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = this._pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this._pointers.size === 2) {
        const d = this._pinchDist(); this.zoom -= (d - this._pinch) * 0.02; this._pinch = d; return;
      }
      const k = p.type === 'touch' ? 1.25 : 1;
      this.lookDX += dx * k; this.lookDY += dy * k; this.lastLook = performance.now();
    });
    const up = (e) => { this._pointers.delete(e.pointerId); this._pinch = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom += Math.sign(e.deltaY) * 0.6; }, { passive: false });
  }
  _pinchDist() { const a = [...this._pointers.values()]; return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  on(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name) { if (!this.enabled && name !== 'escape' && name !== 'phone' && name !== 'map') return; (this.handlers[name] || []).forEach((f) => f()); }
  get move() {
    let x = 0, y = 0; const k = this.keys;
    if (k.has('w') || k.has('arrowup')) y += 1; if (k.has('s') || k.has('arrowdown')) y -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1; if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (this.joy.active) { x += this.joy.x; y += this.joy.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return this.enabled ? { x, y, mag: Math.min(1, l) } : { x: 0, y: 0, mag: 0 };
  }
  get running() { return this.keys.has('shift') || this.runToggle || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.92); }
  consumeLook() { const r = { dx: this.lookDX, dy: this.lookDY }; this.lookDX = this.lookDY = 0; return r; }
  consumeZoom() { const z = this.zoom; this.zoom = 0; return z; }
  get idleLookMs() { return performance.now() - this.lastLook; }
}

/** On-screen virtual joystick. */
export function mountJoystick(zone, input) {
  const base = zone.querySelector('.joy-base'), knob = zone.querySelector('.joy-knob');
  let id = null, cx = 0, cy = 0; const R = 54;
  const set = (x, y) => { input.joy.x = x; input.joy.y = y; input.joy.active = x !== 0 || y !== 0; knob.style.transform = `translate(${x * R}px, ${-y * R}px)`; };
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return; id = e.pointerId; zone.setPointerCapture(id);
    const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
  });
  const move = (e) => {
    if (e.pointerId !== id) return;
    let dx = (e.clientX - cx) / R, dy = -(e.clientY - cy) / R; const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; } if (l < 0.12) { dx = dy = 0; }
    set(dx, dy);
  };
  zone.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; set(0, 0); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
