/**
 * Three.js setup for the head lighting study: renderer, camera, backdrop,
 * the head, and the light rig - plus the pointer handling that lets you grab
 * the key light and swing it around the head.
 */

import {
  ACESFilmicToneMapping,
  Color,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HeadModel } from '../../head/headModel';
import { LightRig, type LightState } from './lighting';

/** Roughly the middle of the face - what the camera and the lights point at. */
const FOCUS = new Vector3(0, -0.02, 0);

export class StudioScene {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly head = new HeadModel();
  readonly rig = new LightRig(FOCUS);

  private readonly canvas: HTMLCanvasElement;
  private readonly backdrop: Mesh[] = [];
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private draggingLight = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene.background = new Color(0x0f1116);

    this.camera = new PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0.1, 3.3);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(FOCUS);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 7;
    this.controls.update();

    this.scene.add(this.head.root, this.rig.root);
    this.buildBackdrop();
    this.resize();
  }

  private buildBackdrop(): void {
    const material = new MeshStandardMaterial({ color: 0x23262d, roughness: 0.95, metalness: 0 });

    const floor = new Mesh(new PlaneGeometry(24, 24), material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.17;
    floor.receiveShadow = true;

    const wall = new Mesh(new PlaneGeometry(24, 14), material);
    wall.position.set(0, 2, -2.6);
    wall.receiveShadow = true;

    this.backdrop.push(floor, wall);
    this.scene.add(floor, wall);
  }

  setBackdropVisible(visible: boolean): void {
    for (const mesh of this.backdrop) mesh.visible = visible;
  }

  setExposure(value: number): void {
    this.renderer.toneMappingExposure = value;
  }

  applyLights(state: LightState): void {
    this.rig.apply(state);
  }

  resize(): void {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Lets the user drag the glowing handle (or shift-drag anywhere) to move the
   * key light. `onMove` receives the new azimuth/elevation in degrees.
   */
  enableLightDragging(onMove: (azimuth: number, elevation: number) => void): void {
    const updatePointer = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const hitsHandle = () => {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this.raycaster.intersectObject(this.rig.handle, false).length > 0;
    };

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      updatePointer(event);
      if (!event.shiftKey && !hitsHandle()) return;
      this.draggingLight = true;
      this.controls.enabled = false;
      this.canvas.setPointerCapture(event.pointerId);
      this.moveLightToPointer(onMove);
      event.preventDefault();
    });

    this.canvas.addEventListener('pointermove', (event) => {
      updatePointer(event);
      if (this.draggingLight) {
        this.moveLightToPointer(onMove);
        return;
      }
      this.canvas.classList.toggle('is-grabbable', hitsHandle());
    });

    const end = (event: PointerEvent) => {
      if (!this.draggingLight) return;
      this.draggingLight = false;
      this.controls.enabled = true;
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  private moveLightToPointer(onMove: (azimuth: number, elevation: number) => void): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const direction = directionOnSphere(
      this.raycaster.ray.origin,
      this.raycaster.ray.direction,
      this.rig.focus,
      this.rig.handleRadius,
    );
    const azimuth = (Math.atan2(direction.x, direction.z) * 180) / Math.PI;
    const elevation = (Math.asin(clamp(direction.y, -1, 1)) * 180) / Math.PI;
    onMove(round(azimuth), round(elevation));
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Unit direction from `centre` towards where the ray meets the sphere. If the
 * ray misses (pointer outside the sphere's silhouette) it falls back to the
 * nearest point on the sphere, so dragging never "falls off".
 */
function directionOnSphere(
  origin: Vector3,
  direction: Vector3,
  centre: Vector3,
  radius: number,
): Vector3 {
  const toCentre = new Vector3().subVectors(centre, origin);
  const along = toCentre.dot(direction);
  const closest = new Vector3().copy(direction).multiplyScalar(along).add(origin);
  const offset = new Vector3().subVectors(closest, centre);
  const offsetLength = offset.length();

  if (offsetLength >= radius) return offset.normalize();

  const back = Math.sqrt(radius * radius - offsetLength * offsetLength);
  const hit = new Vector3()
    .copy(direction)
    .multiplyScalar(along - back)
    .add(origin);
  return hit.sub(centre).normalize();
}
