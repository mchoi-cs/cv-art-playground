/**
 * A tiny lofting helper: stack horizontal cross-sections, skin them, cap the
 * ends. Everything in the placeholder head (skull, nose, neck, plinth) is
 * built from this.
 *
 * Cross-sections are described as a half profile that is mirrored across X, so
 * the model is symmetric by construction and there is only one set of numbers
 * to tune.
 */

import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

export interface ProfilePoint {
  /** Fraction of the ring's half-width. 0 on the centre line, 1 at the widest. */
  xf: number;
  /** +1 = full depth in front, -1 = full depth behind. */
  zf: number;
}

export interface Ring {
  y: number;
  /** Half-width in X. */
  w: number;
  /** Depth in front of the ring centre. */
  fz: number;
  /** Depth behind the ring centre. */
  bz: number;
  /** Shifts the whole section back/forward (the neck sits behind the chin). */
  cz?: number;
  /** Overrides the shared profile for this section only. */
  profile?: ProfilePoint[];
}

export type Cap = 'none' | 'flat' | { y: number; z?: number };

export interface LoftOptions {
  profile: ProfilePoint[];
  top?: Cap;
  bottom?: Cap;
}

/** Welds vertices that land on the same spot so smooth shading has something to average. */
class VertexWelder {
  private readonly lookup = new Map<string, number>();
  readonly positions: number[] = [];

  add(x: number, y: number, z: number): number {
    const key = `${round(x)},${round(y)},${round(z)}`;
    const existing = this.lookup.get(key);
    if (existing !== undefined) return existing;
    const index = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.lookup.set(key, index);
    return index;
  }
}

function round(value: number): number {
  return Math.round(value * 1e4);
}

function ringPoints(ring: Ring, fallback: ProfilePoint[]): Vector3[] {
  const profile = ring.profile ?? fallback;
  const cz = ring.cz ?? 0;
  const toPoint = (p: ProfilePoint, sign: number) =>
    new Vector3(sign * p.xf * ring.w, ring.y, cz + (p.zf >= 0 ? p.zf * ring.fz : p.zf * ring.bz));

  const points = profile.map((p) => toPoint(p, 1));
  // Mirror everything except the two centre-line points at the ends.
  for (let i = profile.length - 2; i >= 1; i--) {
    points.push(toPoint(profile[i], -1));
  }
  return points;
}

/**
 * Rings must run top to bottom. The resulting geometry is indexed with welded
 * vertices and smooth normals; set `flatShading` on the material to see the
 * planes instead.
 */
export function buildLoft(rings: Ring[], options: LoftOptions): BufferGeometry {
  if (rings.length < 2) throw new Error('buildLoft needs at least two rings');

  const welder = new VertexWelder();
  const indices: number[] = [];
  const ringIndices = rings.map((ring) =>
    ringPoints(ring, options.profile).map((p) => welder.add(p.x, p.y, p.z)),
  );

  for (let r = 0; r < rings.length - 1; r++) {
    const upper = ringIndices[r];
    const lower = ringIndices[r + 1];
    const count = upper.length;
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      pushTriangle(indices, lower[i], lower[next], upper[next]);
      pushTriangle(indices, lower[i], upper[next], upper[i]);
    }
  }

  capEnd(welder, indices, rings[0], ringIndices[0], options.top ?? 'none', 'top', options.profile);
  capEnd(
    welder,
    indices,
    rings[rings.length - 1],
    ringIndices[ringIndices.length - 1],
    options.bottom ?? 'none',
    'bottom',
    options.profile,
  );

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(welder.positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function pushTriangle(indices: number[], a: number, b: number, c: number): void {
  if (a === b || b === c || a === c) return; // collapsed by welding
  indices.push(a, b, c);
}

function capEnd(
  welder: VertexWelder,
  indices: number[],
  ring: Ring,
  ringIndex: number[],
  cap: Cap,
  side: 'top' | 'bottom',
  profile: ProfilePoint[],
): void {
  if (cap === 'none') return;

  let centre: Vector3;
  if (cap === 'flat') {
    const points = ringPoints(ring, profile);
    centre = points.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / points.length);
  } else {
    centre = new Vector3(0, cap.y, cap.z ?? ring.cz ?? 0);
  }

  const centreIndex = welder.add(centre.x, centre.y, centre.z);
  const count = ringIndex.length;
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    if (side === 'top') {
      pushTriangle(indices, centreIndex, ringIndex[i], ringIndex[next]);
    } else {
      pushTriangle(indices, centreIndex, ringIndex[next], ringIndex[i]);
    }
  }
}
