/**
 * Copies the MediaPipe WASM runtime out of node_modules and into
 * `public/mediapipe/wasm`, for working offline or avoiding the CDN.
 *
 *   npm run wasm:local
 *
 * Then point `config.mediapipe.wasmBase` at `${BASE}mediapipe/wasm`.
 * The copied files are gitignored - they are ~35 MB and reproducible.
 */

import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
  new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url),
);
const target = fileURLToPath(new URL('../public/mediapipe/wasm', import.meta.url));

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

console.info(`Copied MediaPipe WASM runtime to public/mediapipe/wasm`);
console.info('Set config.mediapipe.wasmBase to `${BASE}mediapipe/wasm` to use it.');
