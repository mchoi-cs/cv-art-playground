/**
 * Demo 1 - head lighting study.
 *
 * Wires the webcam/MediaPipe session to the 3D studio: the tracked head pose
 * drives the bust, the panel drives the lights, and everything degrades to a
 * gentle idle sway when there is no camera to be had.
 */

import '../../styles/base.css';
import '../../styles/demo.css';

import { config } from '../../core/config';
import { FaceTracker, type FaceFrame } from '../../core/faceTracker';
import { TrackingSession, type TrackingStatus } from '../../core/trackingSession';
import { bindCheckbox, bindRange, degrees, el, fixed } from '../../ui/dom';
import { HeadPoseDriver } from './headPose';
import { DEFAULT_LIGHT_STATE, type LightState } from './lighting';
import { LIGHTING_PRESETS } from './presets';
import { StudioScene } from './scene';

/** How long a face can go missing before we admit we have lost it. */
const FACE_TIMEOUT_MS = 1200;

const canvas = el<HTMLCanvasElement>('view');
const previewVideo = el<HTMLVideoElement>('preview');
const previewWrap = el<HTMLElement>('preview-wrap');
const previewState = el<HTMLElement>('preview-state');
const statusLine = el<HTMLElement>('camera-status');
const cameraToggle = el<HTMLButtonElement>('camera-toggle');
const messageCard = el<HTMLElement>('message');
const messageTitle = el<HTMLElement>('message-title');
const messageBody = el<HTMLElement>('message-body');
const presetNote = el<HTMLElement>('preset-note');
const modelName = el<HTMLElement>('model-name');
const dropOverlay = el<HTMLElement>('drop-overlay');
const poseYaw = el<HTMLElement>('pose-yaw');
const posePitch = el<HTMLElement>('pose-pitch');
const poseRoll = el<HTMLElement>('pose-roll');

const scene = new StudioScene(canvas);
const pose = new HeadPoseDriver();
const light: LightState = { ...DEFAULT_LIGHT_STATE };

const session = new TrackingSession<FaceFrame>({
  createTask: () => FaceTracker.create(),
  video: previewVideo,
});

let idleMotion = true;
let previewWanted = true;
let lastFaceMs = -Infinity;

function applyLight(): void {
  scene.applyLights(light);
}

// ---------------------------------------------------------------- messages

function showMessage(title: string, body: string): void {
  messageTitle.textContent = title;
  messageBody.textContent = body;
  messageCard.hidden = false;
}

function hideMessage(): void {
  messageCard.hidden = true;
}

function setStatus(text: string, tone: 'idle' | 'busy' | 'live' | 'error'): void {
  if (statusLine.textContent !== text) statusLine.textContent = text;
  statusLine.className = `status status--${tone}`;
}

// ---------------------------------------------------------------- tracking

session.onStatusChange((status: TrackingStatus) => {
  switch (status.state) {
    case 'idle':
    case 'stopped':
      setStatus('Camera off \u2014 idle sway running.', 'idle');
      cameraToggle.textContent = 'Start camera';
      cameraToggle.disabled = false;
      updatePreviewVisibility();
      break;
    case 'starting':
      setStatus(status.message, 'busy');
      cameraToggle.textContent = 'Starting\u2026';
      cameraToggle.disabled = true;
      hideMessage();
      break;
    case 'running':
      setStatus('Looking for a face\u2026', 'busy');
      cameraToggle.textContent = 'Stop camera';
      cameraToggle.disabled = false;
      hideMessage();
      updatePreviewVisibility();
      break;
    case 'error':
      setStatus(status.message, 'error');
      cameraToggle.textContent = 'Try again';
      cameraToggle.disabled = false;
      showMessage('Tracking is paused', status.message);
      updatePreviewVisibility();
      break;
  }
});

cameraToggle.addEventListener('click', () => {
  if (session.isRunning) {
    session.stop();
    pose.reset();
  } else {
    void session.start();
  }
});

function updatePreviewVisibility(): void {
  previewWrap.hidden = !(previewWanted && session.isRunning);
}

// ---------------------------------------------------------------- controls

bindCheckbox('idle-motion', true, (checked) => {
  idleMotion = checked;
});
bindCheckbox('hold-pose', false, (checked) => {
  pose.hold = checked;
});
bindCheckbox('mirror', true, (checked) => {
  pose.mirror = checked;
});
bindCheckbox('preview-show', true, (checked) => {
  previewWanted = checked;
  updatePreviewVisibility();
});
el<HTMLButtonElement>('preview-hide').addEventListener('click', () => {
  const input = el<HTMLInputElement>('preview-show');
  input.checked = false;
  previewWanted = false;
  updatePreviewVisibility();
});

bindRange(
  'smoothing',
  pose.smoothingSeconds,
  (value) => {
    pose.smoothingSeconds = value;
  },
  (value) => (value < 0.005 ? 'off' : `${Math.round(value * 1000)} ms`),
);

const sliders = {
  azimuth: bindRange('azimuth', light.azimuth, (value) => update('azimuth', value), degrees),
  elevation: bindRange(
    'elevation',
    light.elevation,
    (value) => update('elevation', value),
    degrees,
  ),
  distance: bindRange('distance', light.distance, (value) => update('distance', value), fixed(2)),
  intensity: bindRange(
    'intensity',
    light.intensity,
    (value) => update('intensity', value),
    fixed(2),
  ),
  softness: bindRange('softness', light.softness, (value) => update('softness', value), fixed(2)),
  fill: bindRange('fill', light.fill, (value) => update('fill', value), fixed(2)),
  rim: bindRange('rim', light.rim, (value) => update('rim', value), fixed(2)),
};

const colorInput = el<HTMLInputElement>('color');
colorInput.value = light.color;
colorInput.addEventListener('input', () => {
  light.color = colorInput.value;
  applyLight();
  clearActivePreset();
});

function update<K extends keyof LightState>(key: K, value: LightState[K]): void {
  light[key] = value;
  applyLight();
  clearActivePreset();
}

bindRange('exposure', 1, (value) => scene.setExposure(value), fixed(2));
bindCheckbox('flat-shading', true, (checked) => scene.head.setFlatShading(checked));
bindCheckbox('edges', false, (checked) => scene.head.setEdgesVisible(checked));
bindCheckbox('stand', true, (checked) => scene.head.setStandVisible(checked));
bindCheckbox('backdrop', true, (checked) => scene.setBackdropVisible(checked));

el<HTMLButtonElement>('reset-view').addEventListener('click', () => {
  scene.camera.position.set(0, 0.1, 3.3);
  scene.controls.target.set(0, -0.02, 0);
  scene.controls.update();
});

// ---------------------------------------------------------------- presets

const presetButtons = new Map<string, HTMLButtonElement>();
const presetContainer = el<HTMLElement>('presets');

for (const preset of LIGHTING_PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'preset';
  button.textContent = preset.name;
  button.title = preset.note;
  button.addEventListener('click', () => {
    Object.assign(light, preset.values);
    syncSliders();
    applyLight();
    setActivePreset(preset.id);
    presetNote.textContent = preset.note;
  });
  presetButtons.set(preset.id, button);
  presetContainer.append(button);
}

function setActivePreset(id: string | null): void {
  for (const [presetId, button] of presetButtons) {
    button.classList.toggle('is-active', presetId === id);
  }
}

function clearActivePreset(): void {
  setActivePreset(null);
}

function syncSliders(): void {
  sliders.azimuth.set(light.azimuth);
  sliders.elevation.set(light.elevation);
  sliders.distance.set(light.distance);
  sliders.intensity.set(light.intensity);
  sliders.softness.set(light.softness);
  sliders.fill.set(light.fill);
  sliders.rim.set(light.rim);
  colorInput.value = light.color;
}

// ---------------------------------------------------------------- head model

function setModelName(name: string): void {
  modelName.textContent = name;
}

async function loadModelFile(file: File): Promise<void> {
  try {
    await scene.head.loadFromFile(file);
    setModelName(scene.head.label);
    hideMessage();
  } catch (error) {
    console.error('[head-lighting] could not load model', error);
    showMessage('That model would not load', `${file.name} could not be read as a glTF file.`);
  }
}

el<HTMLInputElement>('model-file').addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void loadModelFile(file);
});

el<HTMLButtonElement>('model-reset').addEventListener('click', () => {
  scene.head.loadProcedural();
  scene.head.setFlatShading(el<HTMLInputElement>('flat-shading').checked);
  scene.head.setEdgesVisible(el<HTMLInputElement>('edges').checked);
  scene.head.setStandVisible(el<HTMLInputElement>('stand').checked);
  setModelName(scene.head.label);
});

let dragDepth = 0;
window.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  dropOverlay.hidden = false;
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropOverlay.hidden = true;
});
window.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropOverlay.hidden = true;
  const file = [...(event.dataTransfer?.files ?? [])].find((candidate) =>
    /\.(glb|gltf)$/i.test(candidate.name),
  );
  if (file) void loadModelFile(file);
});

if (config.head.modelUrl) {
  scene.head
    .loadFromUrl(config.head.modelUrl)
    .then(() => setModelName(scene.head.label))
    .catch((error: unknown) => {
      console.warn('[head-lighting] configured model failed to load', error);
      showMessage(
        'Custom head model failed to load',
        'Falling back to the built-in bust. Check config.head.modelUrl.',
      );
    });
}

// ---------------------------------------------------------------- loop

scene.enableLightDragging((azimuth, elevation) => {
  light.azimuth = azimuth;
  light.elevation = elevation;
  sliders.azimuth.set(azimuth);
  sliders.elevation.set(elevation);
  applyLight();
  clearActivePreset();
});

window.addEventListener('resize', () => scene.resize());

const startedMs = performance.now();
let lastFrameMs = startedMs;

function frame(now: number): void {
  const delta = Math.min((now - lastFrameMs) / 1000, 0.1);
  lastFrameMs = now;

  const tracked = session.poll(now);
  if (tracked && pose.setFromFrame(tracked)) lastFaceMs = now;

  const faceIsFresh = now - lastFaceMs < FACE_TIMEOUT_MS;
  if (!faceIsFresh && idleMotion) pose.setFromDemoMotion((now - startedMs) / 1000);

  scene.head.pivot.quaternion.copy(pose.tick(delta));

  if (session.isRunning) {
    setStatus(
      faceIsFresh ? 'Tracking your head pose.' : 'Camera on \u2014 looking for a face\u2026',
      faceIsFresh ? 'live' : 'busy',
    );
    previewState.textContent = faceIsFresh ? 'face found' : 'no face';
  }

  const readout = pose.readout();
  poseYaw.textContent = `${readout.yaw}\u00b0`;
  posePitch.textContent = `${readout.pitch}\u00b0`;
  poseRoll.textContent = `${readout.roll}\u00b0`;

  scene.render();
  requestAnimationFrame(frame);
}

// Start on the preset the demo is really about, then run.
const opening = LIGHTING_PRESETS[0];
Object.assign(light, opening.values);
syncSliders();
applyLight();
setActivePreset(opening.id);
presetNote.textContent = opening.note;
setModelName(scene.head.label);
requestAnimationFrame(frame);
