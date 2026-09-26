/**
 * Shared MediaPipe Tasks Vision runtime.
 *
 * The WASM fileset is a few MB, so it is resolved once and reused by every
 * task (Demo 1's Face Landmarker, and later Demo 2's Gesture Recognizer).
 */

import { FilesetResolver } from '@mediapipe/tasks-vision';
import { config } from './config';

/** `WasmFileset` is not exported from the package, so borrow it from the resolver. */
export type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

let filesetPromise: Promise<VisionFileset> | null = null;

export function loadVisionFileset(): Promise<VisionFileset> {
  filesetPromise ??= FilesetResolver.forVisionTasks(config.mediapipe.wasmBase);
  return filesetPromise;
}

/** Prefer the GPU delegate, but fall back to CPU on machines without WebGL2. */
export function preferredDelegate(): 'GPU' | 'CPU' {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') ? 'GPU' : 'CPU';
  } catch {
    return 'CPU';
  }
}
