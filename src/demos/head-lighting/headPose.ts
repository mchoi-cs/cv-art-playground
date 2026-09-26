/**
 * Turns MediaPipe's facial transformation matrix into a rotation for the 3D
 * head, with smoothing, a mirror toggle, and a "hold this pose" freeze.
 *
 * Only the rotation is used. Translation would let the head drift around the
 * frame, which fights with the fixed studio framing an artist wants when
 * studying light.
 */

import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { FaceFrame } from '../../core/faceTracker';
import { SmoothedQuaternion } from '../../core/smoothing';

export interface PoseReadout {
  yaw: number;
  pitch: number;
  roll: number;
}

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchScale = new Vector3();
const scratchEuler = new Euler(0, 0, 0, 'YXZ');

export class HeadPoseDriver {
  /** Selfie view: the model turns the way she sees herself turn in a mirror. */
  mirror = true;
  /** Freeze the pose so a pose can be studied under changing light. */
  hold = false;

  private readonly smoother = new SmoothedQuaternion(0.09);
  private readonly target = new Quaternion();
  private readonly readoutValue: PoseReadout = { yaw: 0, pitch: 0, roll: 0 };

  set smoothingSeconds(value: number) {
    this.smoother.tauSeconds = value;
  }

  get smoothingSeconds(): number {
    return this.smoother.tauSeconds;
  }

  /** Returns false when the frame had no face in it. */
  setFromFrame(frame: FaceFrame | null): boolean {
    if (!frame?.matrix || this.hold) return Boolean(frame?.matrix);
    scratchMatrix.fromArray(frame.matrix);
    scratchMatrix.decompose(scratchPosition, this.target, scratchScale);
    if (this.mirror) mirrorX(this.target);
    return true;
  }

  /**
   * Gentle idle sway so the rig is legible before the camera is switched on.
   * Every term starts at zero so the page opens on a neutral, front-on pose.
   */
  setFromDemoMotion(timeSeconds: number): void {
    if (this.hold) return;
    scratchEuler.set(
      degrees(10 * Math.sin(timeSeconds * 0.31)),
      degrees(22 * Math.sin(timeSeconds * 0.45)),
      degrees(6 * Math.sin(timeSeconds * 0.23)),
      'YXZ',
    );
    this.target.setFromEuler(scratchEuler);
  }

  /** Advances the smoothing and returns the rotation to apply to the head. */
  tick(deltaSeconds: number): Quaternion {
    return this.smoother.update(this.target.clone(), deltaSeconds);
  }

  reset(): void {
    this.target.identity();
    this.smoother.reset();
  }

  readout(): PoseReadout {
    scratchEuler.setFromQuaternion(this.smoother.value, 'YXZ');
    this.readoutValue.yaw = Math.round((scratchEuler.y * 180) / Math.PI);
    this.readoutValue.pitch = Math.round((scratchEuler.x * 180) / Math.PI);
    this.readoutValue.roll = Math.round((scratchEuler.z * 180) / Math.PI);
    return this.readoutValue;
  }
}

function degrees(value: number): number {
  return (value * Math.PI) / 180;
}

/** Reflecting a rotation across the YZ plane flips yaw and roll, keeps pitch. */
function mirrorX(quaternion: Quaternion): void {
  quaternion.set(quaternion.x, -quaternion.y, -quaternion.z, quaternion.w);
}
