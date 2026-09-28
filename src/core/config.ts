/**
 * Project-wide configuration.
 *
 * Everything here is client-side only: no API keys, no backend. The MediaPipe
 * runtime and model are fetched from public CDNs the first time a demo starts
 * and are then cached by the browser. Webcam frames never leave the device.
 */

const BASE = import.meta.env.BASE_URL;

/** Version of @mediapipe/tasks-vision in package.json. Keep the two in sync. */
const MEDIAPIPE_VERSION = '1.0.1';

export const config = {
  mediapipe: {
    /**
     * Where the MediaPipe WASM runtime is loaded from.
     *
     * To self-host instead (offline dev, or if you would rather not hit a CDN),
     * run `npm run wasm:local` and change this to `${BASE}mediapipe/wasm`.
     */
    wasmBase: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,

    /** Face Landmarker bundle (Apache-2.0, published by Google). */
    faceLandmarkerModel:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  },

  webcam: {
    width: 640,
    height: 480,
    frameRate: 30,
  },

  head: {
    /**
     * Optional custom head model. Drop a .glb / .gltf into `public/models/` and
     * point this at it, e.g. `${BASE}models/asaro-head.glb`.
     *
     * You can also just drag a .glb onto the demo page at runtime - nothing is
     * uploaded, the file is read locally.
     *
     * The model should be roughly head-shaped, Y-up, facing +Z. It is
     * auto-centred and auto-scaled on load, so absolute units do not matter.
     */
    modelUrl: null as string | null,
  },
} as const;

export { BASE };
