/**
 * Frame-rate independent exponential smoothing.
 *
 * Raw landmark output jitters by a degree or two every frame, which reads as a
 * nervous twitch on a 3D head. Everything here converges towards the target
 * with a time constant in seconds, so the feel stays the same whether the
 * browser is running at 30 or 120 fps.
 */

import { Quaternion, Vector3 } from 'three';

/** Fraction of the remaining distance to close this frame. */
function alphaFor(tauSeconds: number, dtSeconds: number): number {
  if (tauSeconds <= 0) return 1;
  return 1 - Math.exp(-Math.max(dtSeconds, 0) / tauSeconds);
}

export class SmoothedQuaternion {
  readonly value = new Quaternion();
  tauSeconds: number;
  private initialised = false;

  constructor(tauSeconds = 0.09) {
    this.tauSeconds = tauSeconds;
  }

  update(target: Quaternion, dtSeconds: number): Quaternion {
    if (!this.initialised) {
      this.value.copy(target);
      this.initialised = true;
      return this.value;
    }
    // Take the shorter arc; otherwise the head can spin the long way round.
    if (this.value.dot(target) < 0) {
      target.set(-target.x, -target.y, -target.z, -target.w);
    }
    this.value.slerp(target, alphaFor(this.tauSeconds, dtSeconds));
    return this.value;
  }

  reset(): void {
    this.initialised = false;
  }
}

export class SmoothedVector3 {
  readonly value = new Vector3();
  tauSeconds: number;
  private initialised = false;

  constructor(tauSeconds = 0.09) {
    this.tauSeconds = tauSeconds;
  }

  update(target: Vector3, dtSeconds: number): Vector3 {
    if (!this.initialised) {
      this.value.copy(target);
      this.initialised = true;
      return this.value;
    }
    this.value.lerp(target, alphaFor(this.tauSeconds, dtSeconds));
    return this.value;
  }

  reset(): void {
    this.initialised = false;
  }
}
