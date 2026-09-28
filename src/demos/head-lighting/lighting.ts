/**
 * The light rig: one movable key light, a hemisphere fill, and an optional
 * kicker behind the head.
 *
 * The key is positioned on a sphere around the head so the controls speak the
 * same language as a photographer: azimuth (round the clock), elevation (up
 * and down), distance. Its intensity is compensated for distance, so pulling
 * the light back softens the falloff across the face without simply making
 * everything darker.
 */

import {
  BufferGeometry,
  Color,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  SpotLight,
  Vector3,
} from 'three';

/**
 * The grab handle sits at a fixed radius rather than at the light's real
 * distance, so it stays on screen (and grabbable) however far the light is
 * pushed back.
 */
const HANDLE_RADIUS = 0.95;

export interface LightState {
  /** Degrees. 0 = straight in front of the head, +90 = camera right. */
  azimuth: number;
  /** Degrees. 0 = eye level, +90 = directly overhead. */
  elevation: number;
  distance: number;
  /** Artist-facing brightness, roughly 0-3. Distance compensated. */
  intensity: number;
  color: string;
  /** Ambient bounce, 0-1. */
  fill: number;
  /** Kicker opposite the key, 0-2. */
  rim: number;
  /** Spot edge softness, 0-1. */
  softness: number;
}

export const DEFAULT_LIGHT_STATE: LightState = {
  azimuth: 42,
  elevation: 42,
  distance: 3.4,
  intensity: 1.6,
  color: '#fff1de',
  fill: 0.12,
  rim: 0,
  softness: 0.65,
};

export function positionOnSphere(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
  centre: Vector3,
  out = new Vector3(),
): Vector3 {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  const horizontal = Math.cos(elevation) * distance;
  return out.set(
    centre.x + horizontal * Math.sin(azimuth),
    centre.y + distance * Math.sin(elevation),
    centre.z + horizontal * Math.cos(azimuth),
  );
}

export class LightRig {
  readonly root = new Object3D();
  readonly key = new SpotLight(0xffffff, 1);
  readonly rim = new SpotLight(0xbdd4ff, 0);
  readonly fill = new HemisphereLight(0x93a9c6, 0x3b3226, 0.3);
  /** Little glowing ball the user can grab to move the key light. */
  readonly handle: Mesh;
  /** Faint line from the handle back to the head, so the aim is readable. */
  private readonly beam: Line;

  private readonly aim = new Object3D();
  private readonly rimAim = new Object3D();
  private readonly centre: Vector3;

  constructor(centre = new Vector3(0, 0, 0)) {
    this.centre = centre.clone();

    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 20;
    this.key.angle = 0.62;
    this.key.decay = 2;

    this.rim.angle = 0.8;
    this.rim.penumbra = 0.9;
    this.rim.decay = 2;

    this.aim.position.copy(this.centre);
    this.rimAim.position.copy(this.centre);
    this.key.target = this.aim;
    this.rim.target = this.rimAim;

    this.handle = new Mesh(
      new SphereGeometry(0.055, 20, 14),
      new MeshBasicMaterial({ color: 0xffe9b8, toneMapped: false }),
    );
    this.handle.name = 'light-handle';

    this.beam = new Line(
      new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
      new LineBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.18 }),
    );

    this.root.add(this.key, this.aim, this.rim, this.rimAim, this.fill, this.handle, this.beam);
  }

  apply(state: LightState): void {
    const keyPosition = positionOnSphere(
      state.azimuth,
      state.elevation,
      state.distance,
      this.centre,
    );
    this.key.position.copy(keyPosition);
    positionOnSphere(
      state.azimuth,
      state.elevation,
      HANDLE_RADIUS,
      this.centre,
      this.handle.position,
    );
    this.beam.geometry.setFromPoints([this.handle.position.clone(), this.centre.clone()]);

    // Physical falloff means intensity has to scale with distance squared for
    // the face to keep the same exposure as the light is moved in or out.
    const compensation = state.distance * state.distance;
    this.key.intensity = state.intensity * compensation * 1.15;
    this.key.color = new Color(state.color);
    this.key.penumbra = state.softness;
    (this.handle.material as MeshBasicMaterial).color = new Color(state.color);

    positionOnSphere(
      state.azimuth + 168,
      Math.max(state.elevation * 0.4, 12),
      state.distance,
      this.centre,
      this.rim.position,
    );
    this.rim.intensity = state.rim * compensation * 1.15;

    this.fill.intensity = state.fill * 2.6;
  }

  /** Where the light is aimed - also the centre of the drag sphere. */
  get focus(): Vector3 {
    return this.centre;
  }

  get handleRadius(): number {
    return HANDLE_RADIUS;
  }
}
