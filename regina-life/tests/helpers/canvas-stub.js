/**
 * A do-nothing 2D canvas so world code that paints textures (world/textures.js, the TV screen, signs) can be instantiated in vitest's node
 * environment. Install BEFORE importing anything that builds an interior:  import './helpers/canvas-stub.js'  (side effect), or call installCanvasStub().
 * It records nothing and draws nothing; it only has to not throw and to report the width/height it was given.
 */
const ctx2d = () => {
  const gradient = { addColorStop() {} };
  const target = { createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => ({}), measureText: (t) => ({ width: String(t).length * 7 }), getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), canvas: null };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
};
export function installCanvasStub() {
  if (globalThis.document?.createElement) return;
  const mk = () => { const c = { width: 0, height: 0, style: {}, getContext: () => { const x = ctx2d(); x.canvas = c; return x; }, toDataURL: () => 'data:image/png;base64,', addEventListener() {}, removeEventListener() {} }; return c; };
  globalThis.document = { createElement: (tag) => (tag === 'canvas' ? mk() : { style: {}, addEventListener() {}, setAttribute() {}, appendChild() {} }), getElementById: () => null };
}
installCanvasStub();
