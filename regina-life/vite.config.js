import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  // two pages: the game, and the Advertise / Support page (which loads without three.js)
  build: { chunkSizeWarningLimit: 1200, target: 'es2020', rollupOptions: { input: { main: 'index.html', advertise: 'advertise.html' } } },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
