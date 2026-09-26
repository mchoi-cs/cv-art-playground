/**
 * The thing being lit.
 *
 * Owns the scene graph for the head: a static neck/plinth, and a pivot that
 * the tracked pose is applied to. The mesh inside that pivot is swappable -
 * the built-in procedural bust, a .glb from `config.head.modelUrl`, or a .glb
 * the user drops onto the page.
 */

import {
  Box3,
  BufferGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildProceduralHead, HEAD_PIVOT } from './proceduralHead';

/** Chin-to-crown size every model is normalised to, so framing never changes. */
const TARGET_HEIGHT = 1.15;
/** Only draw an outline where two planes actually break, not across a smooth curve. */
const EDGE_THRESHOLD_DEGREES = 18;

export type HeadSource = 'procedural' | 'custom';

export class HeadModel {
  readonly root = new Group();
  /** The tracked head rotation is applied to this. */
  readonly pivot = new Object3D();

  readonly material = new MeshStandardMaterial({
    color: 0xd8d2c8,
    roughness: 0.82,
    metalness: 0.0,
    flatShading: true,
  });

  private readonly edgeMaterial = new LineBasicMaterial({
    color: 0x101216,
    transparent: true,
    opacity: 0.45,
  });

  private readonly inner = new Object3D();
  private readonly standGroup = new Group();
  private readonly outlines: LineSegments[] = [];

  private source: HeadSource = 'procedural';
  private sourceLabel = 'Built-in planes head';
  private edgesVisible = false;
  private standWanted = true;

  constructor() {
    this.pivot.position.copy(HEAD_PIVOT);
    this.inner.position.copy(HEAD_PIVOT).negate();
    this.pivot.add(this.inner);
    this.root.add(this.pivot, this.standGroup);
    this.loadProcedural();
  }

  get currentSource(): HeadSource {
    return this.source;
  }

  get label(): string {
    return this.sourceLabel;
  }

  loadProcedural(): void {
    const { head, stand } = buildProceduralHead();
    this.replaceHead(head.map((geometry) => this.toMesh(geometry)));
    this.clear(this.standGroup);
    for (const geometry of stand) this.standGroup.add(this.toMesh(geometry));
    this.source = 'procedural';
    this.sourceLabel = 'Built-in planes head';
    this.applyStandVisibility();
    this.rebuildEdges();
  }

  async loadFromUrl(url: string): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    this.adoptGltfScene(gltf.scene, url.split('/').pop() ?? url);
  }

  async loadFromFile(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(buffer, '');
    this.adoptGltfScene(gltf.scene, file.name);
  }

  setFlatShading(flat: boolean): void {
    this.material.flatShading = flat;
    this.material.needsUpdate = true;
  }

  setEdgesVisible(visible: boolean): void {
    this.edgesVisible = visible;
    for (const outline of this.outlines) outline.visible = visible;
  }

  setStandVisible(visible: boolean): void {
    this.standWanted = visible;
    this.applyStandVisibility();
  }

  private applyStandVisibility(): void {
    // A user-supplied head usually models its own neck, so the plinth would collide.
    this.standGroup.visible = this.standWanted && this.source === 'procedural';
  }

  private adoptGltfScene(scene: Object3D, label: string): void {
    normalise(scene);
    scene.traverse((node) => {
      if (node instanceof Mesh) {
        node.material = this.material;
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    this.replaceHead([scene]);
    this.source = 'custom';
    this.sourceLabel = label;
    this.applyStandVisibility();
    this.rebuildEdges();
  }

  private replaceHead(objects: Object3D[]): void {
    this.clear(this.inner);
    for (const object of objects) this.inner.add(object);
  }

  private toMesh(geometry: BufferGeometry): Mesh {
    const mesh = new Mesh(geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /** Outlines hang off their own mesh, so they inherit the head's transform for free. */
  private rebuildEdges(): void {
    this.outlines.length = 0;
    for (const group of [this.pivot, this.standGroup]) {
      const meshes: Mesh[] = [];
      group.traverse((node) => {
        if (node instanceof Mesh) meshes.push(node);
      });
      for (const mesh of meshes) {
        const outline = new LineSegments(
          new EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEGREES),
          this.edgeMaterial,
        );
        // Nudged outwards, otherwise the lines z-fight with the surface they
        // sit exactly on and mostly vanish.
        outline.scale.setScalar(1.004);
        outline.visible = this.edgesVisible;
        outline.userData.isOutline = true;
        mesh.add(outline);
        this.outlines.push(outline);
      }
    }
  }

  private clear(parent: Object3D): void {
    for (const child of [...parent.children]) {
      parent.remove(child);
      child.traverse((node) => {
        if (node instanceof Mesh || node instanceof LineSegments) node.geometry.dispose();
      });
    }
  }
}

/** Centre a loaded model on the origin and scale it to a predictable height. */
function normalise(object: Object3D): void {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const height = size.y || size.length() || 1;
  const scale = TARGET_HEIGHT / height;
  object.scale.multiplyScalar(scale);

  object.updateMatrixWorld(true);
  const scaled = new Box3().setFromObject(object);
  const centre = scaled.getCenter(new Vector3());
  object.position.sub(centre);
}
