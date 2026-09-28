/**
 * Thin wrapper around MediaPipe's Face Landmarker.
 *
 * It hands back the raw facial transformation matrix and blendshapes; turning
 * those into something a 3D scene understands is the demo's job (see
 * `src/demos/head-lighting/headPose.ts`).
 */

import {
  FaceLandmarker,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { config } from './config';
import { loadVisionFileset, preferredDelegate } from './vision';

export interface FaceFrame {
  /**
   * Column-major 4x4 transform of the canonical face model in camera space,
   * ready for `THREE.Matrix4.fromArray()`. Null when no face was found.
   */
  matrix: Float32Array | null;
  /** Blendshape scores by name, e.g. `jawOpen`. Empty when unavailable. */
  blendshapes: Map<string, number>;
  landmarks: NormalizedLandmark[] | null;
}

const EMPTY_FRAME: FaceFrame = {
  matrix: null,
  blendshapes: new Map(),
  landmarks: null,
};

export class FaceTracker {
  private readonly landmarker: FaceLandmarker;
  private lastTimestamp = -1;
  private closed = false;

  private constructor(landmarker: FaceLandmarker) {
    this.landmarker = landmarker;
  }

  static async create(): Promise<FaceTracker> {
    const fileset = await loadVisionFileset();
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: config.mediapipe.faceLandmarkerModel,
        delegate: preferredDelegate(),
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    return new FaceTracker(landmarker);
  }

  /**
   * Runs detection on the current video frame. Safe to call every animation
   * frame: duplicate timestamps are skipped because MediaPipe requires
   * monotonically increasing ones in VIDEO mode.
   */
  detect(video: HTMLVideoElement, timestampMs: number): FaceFrame | null {
    if (this.closed || video.readyState < 2) return null;
    const timestamp = Math.max(timestampMs, this.lastTimestamp + 1);
    this.lastTimestamp = timestamp;

    let result: FaceLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, timestamp);
    } catch (error) {
      console.warn('[faceTracker] detection failed for this frame', error);
      return null;
    }
    return toFrame(result);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.landmarker.close();
  }
}

function toFrame(result: FaceLandmarkerResult): FaceFrame {
  const matrixData = result.facialTransformationMatrixes?.[0]?.data;
  if (!matrixData) return EMPTY_FRAME;

  const blendshapes = new Map<string, number>();
  for (const category of result.faceBlendshapes?.[0]?.categories ?? []) {
    if (category.categoryName) blendshapes.set(category.categoryName, category.score);
  }

  return {
    matrix: Float32Array.from(matrixData),
    blendshapes,
    landmarks: result.faceLandmarks?.[0] ?? null,
  };
}
