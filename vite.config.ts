import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The site is published at https://mchoi-cs.github.io/cv-art-playground/, so the
// production base path has to match that sub-path. Local dev stays at "/".
const base = process.env.VITE_BASE ?? '/cv-art-playground/';

export default defineConfig(({ command, isPreview }) => ({
  // Dev stays at "/" for a short URL; builds and `vite preview` use the real
  // Pages sub-path so the deployed layout is what gets tested.
  base: command === 'build' || isPreview ? base : '/',
  // Two separate pages, not a single-page app: without this the preview server
  // answers /demos/head-lighting/ with the landing page.
  appType: 'mpa',
  build: {
    target: 'es2022',
    // three.js plus the MediaPipe bindings land in one chunk and that is fine.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        landing: fromRoot('index.html'),
        headLighting: fromRoot('demos/head-lighting/index.html'),
      },
    },
  },
}));
