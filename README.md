# cv-art-playground

Small browser toys that point a webcam at an art problem. Everything runs client-side: there
is no backend, and **no video ever leaves your device** — the camera frames are read straight
into the page and thrown away.

**Live site: <https://mchoi-cs.github.io/cv-art-playground/>**

## Demos

### 1. Head lighting study — live

A faceted, planes-of-the-head bust copies your head pose (yaw, pitch, roll) in real time from
the webcam. Then you light it: drag the key light around the head, change its intensity,
colour, softness and distance, add fill or a back kicker, and jump to the classic portrait
setups — **Rembrandt, split, loop, butterfly, rim/back light**, plus under-light and top-light
for good measure.

The idea is borrowed from the Asaro head, the faceted study bust artists use to learn the
planes of the head: instead of imagining how light would fall on a pose, you hold the pose and
watch it happen. Flat shading is on by default so the planes read as planes; there is a toggle
for smooth shading, and another to draw the plane breaks as lines.

Handy extras:

- **Hold pose** freezes the head so you can move the light around a pose you liked.
- **Idle sway** keeps the bust moving gently when the camera is off, so the rig stays readable.
- **Mirror (selfie view)** is on by default — the head turns the way you see yourself turn in a
  mirror. Turn it off if you would rather it match the raw camera.
- **Smoothing** trades responsiveness against jitter. Landmarks wobble a degree or two every
  frame; smoothing is what stops the bust twitching.

### 2. Hand gesture animations — coming soon

Map MediaPipe hand gestures (open palm, fist, thumbs up, victory, pointing up, I love you)
onto hand-drawn animation loops, so making a gesture at the camera plays the drawing made for
it. Not built yet. The shared webcam/MediaPipe plumbing in `src/core/` is already set up for a
second demo to reuse, and `public/assets/gestures/` documents the frame format the drawings
should arrive in.

## Running it locally

```bash
npm install
npm run dev
```

Then open the URL it prints (usually <http://localhost:5173>). Browsers only hand over the
webcam on **secure origins**, which means `https://` or `localhost` — an IP address like
`http://192.168.1.x:5173` will be refused by the browser, not by this app.

Other scripts:

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `npm run build`      | Type-checks, then bundles to `dist/`                    |
| `npm run preview`    | Serves the production build at the real base path       |
| `npm run typecheck`  | TypeScript only                                         |
| `npm run lint`       | ESLint                                                  |
| `npm run format`     | Prettier                                                |
| `npm run wasm:local` | Copies the MediaPipe runtime into `public/` for offline |

## Swapping in your own head model

The bust that ships with the repo is **a placeholder built in code** (`src/head/proceduralHead.ts`):
a stack of hand-tuned cross-sections with local features for the brow, eye sockets, cheekbones,
jaw and nose. No third-party 3D model is downloaded or committed, so there is nothing to
license. It is meant to be replaced.

Two ways to use your own:

1. **Drag and drop** — drag a `.glb` or `.gltf` anywhere onto the demo page. It is parsed
   locally in the browser and nothing is uploaded. Quickest way to try a model.
2. **Ship it with the site** — put the file in `public/models/` and set the path in
   `src/core/config.ts`:

   ```ts
   head: {
     modelUrl: `${BASE}models/my-planes-head.glb`,
   }
   ```

Either way the model is auto-centred and auto-scaled, so units do not matter. It should be
Y-up and facing +Z. Materials are replaced with the neutral plaster study material on purpose —
the demo is about reading light on form, so textures would get in the way. The built-in neck and
plinth are hidden for custom models, since most head models bring their own neck.

See `public/models/README.md` for details. Please do not commit third-party models unless the
licence clearly allows redistribution in a public repo; if you do, credit it here with its
licence.

## How it works

```
src/
  core/               shared by every demo
    webcam.ts           getUserMedia with human-readable failure states
    vision.ts           MediaPipe WASM runtime, resolved once and cached
    faceTracker.ts      Face Landmarker wrapper -> transform matrix + blendshapes
    trackingSession.ts  camera + task lifecycle, status events, clean teardown
    smoothing.ts        frame-rate independent exponential smoothing
    config.ts           model URLs, camera settings, custom head model path
  head/
    loft.ts             builds meshes from stacked cross-sections
    proceduralHead.ts   the placeholder bust
    headModel.ts        scene graph, shading modes, .glb loading
  demos/head-lighting/
    main.ts             wiring: tracking -> pose -> scene, and the control panel
    scene.ts            three.js studio, plus dragging the light
    lighting.ts         key / fill / kicker rig in azimuth-elevation terms
    headPose.ts         MediaPipe matrix -> smoothed head rotation
    presets.ts          the classic portrait setups
```

Tracking uses [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
`FaceLandmarker` in video mode with `outputFacialTransformationMatrixes`, which gives a 4×4
transform of the canonical face in camera space. Only the rotation is used — translation would
let the head drift around the frame, which fights with the fixed studio framing. Blendshapes
are requested and passed through too; nothing consumes them yet.

Rendering is [three.js](https://threejs.org): a shadow-casting spot light for the key (the
Rembrandt triangle needs the nose to cast a real shadow), a hemisphere light for fill, and an
optional kicker behind the head. The key's intensity is compensated for distance so pulling it
back softens the falloff instead of just going dark.

The MediaPipe WASM runtime and the face model are fetched from public CDNs on first use and
then cached by the browser. `npm run wasm:local` self-hosts the runtime if you would rather not
depend on a CDN.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which lints, type-checks, builds
and publishes `dist/` to GitHub Pages. The Vite `base` is set to `/cv-art-playground/` to match
the Pages URL. HTTPS is not a nicety here — the webcam simply will not start on an insecure
origin.

## Roadmap

- **Demo 2: hand gesture animations.** MediaPipe Gesture Recognizer driving hand-drawn frame
  sequences, one per gesture.
- **Record clips.** Capture a few seconds of the lit head (or the camera feed) as a video or
  GIF, for reference or for sharing a lighting setup.
- **Custom gestures.** Train a small classifier on your own poses rather than the six built-in
  categories.
- **Estimate real room lighting.** Infer roughly where the light in your actual room is coming
  from and set the virtual key to match, so the bust is lit like you are.
- Smaller things: presets for camera angles, a second head for comparison, using the
  blendshapes already being read (jaw and eyelids), saving lighting setups to a URL.

## Licence

MIT — see [LICENSE](LICENSE).
