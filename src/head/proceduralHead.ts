/**
 * The placeholder head.
 *
 * A deliberately low-poly, planes-of-the-head bust in the spirit of an Asaro
 * head: big flat planes that make it obvious where the light breaks. It is
 * built in code so the repo stays free of third-party model files, and it is
 * meant to be replaced - see `headModel.ts` for loading your own .glb.
 *
 * Model space: +Y up, +Z out of the face, about 1.1 units from chin to crown.
 * The origin sits between the eyes, at eye level.
 *
 * Each horizontal section shares the same 8-point half profile so the plane
 * breaks (the corner of the face, the temple, the back of the skull) line up
 * into continuous vertical edges. Sections that need a local feature - brow
 * ridge, eye socket, cheekbone, jaw - override the profile rather than the
 * section depth, which keeps features local instead of banding right across
 * the face.
 */

import { BufferGeometry, IcosahedronGeometry, Matrix4, Vector3 } from 'three';
import { buildLoft, type ProfilePoint, type Ring } from './loft';

/** Where the head actually turns: base of the skull, about ear height. */
export const HEAD_PIVOT = new Vector3(0, -0.12, -0.1);

// Half profiles, front centre -> side -> back centre.
const BASE: ProfilePoint[] = [
  { xf: 0.0, zf: 1.0 },
  { xf: 0.4, zf: 0.94 },
  { xf: 0.75, zf: 0.73 }, // the corner of the face
  { xf: 0.95, zf: 0.34 },
  { xf: 1.0, zf: -0.06 }, // widest point
  { xf: 0.92, zf: -0.46 },
  { xf: 0.58, zf: -0.85 },
  { xf: 0.0, zf: -1.0 },
];

const BROW: ProfilePoint[] = [
  { xf: 0.0, zf: 0.93 }, // glabella, slightly behind the brow ridge
  { xf: 0.44, zf: 0.96 }, // brow ridge, pushed forward
  { xf: 0.79, zf: 0.68 }, // corner into the temple
  { xf: 0.93, zf: 0.3 },
  { xf: 1.0, zf: -0.06 },
  { xf: 0.92, zf: -0.46 },
  { xf: 0.58, zf: -0.85 },
  { xf: 0.0, zf: -1.0 },
];

const EYE: ProfilePoint[] = [
  { xf: 0.0, zf: 0.9 }, // bridge of the nose stays forward
  { xf: 0.42, zf: 0.78 }, // socket, set back under the brow
  { xf: 0.79, zf: 0.64 },
  { xf: 0.96, zf: 0.32 },
  { xf: 1.0, zf: -0.06 },
  { xf: 0.92, zf: -0.46 },
  { xf: 0.58, zf: -0.85 },
  { xf: 0.0, zf: -1.0 },
];

/** Bottom of the socket, on its way back out to the cheekbone. */
const EYE_LOW: ProfilePoint[] = [
  { xf: 0.0, zf: 0.93 },
  { xf: 0.43, zf: 0.85 },
  { xf: 0.8, zf: 0.7 },
  { xf: 0.97, zf: 0.33 },
  { xf: 1.0, zf: -0.06 },
  { xf: 0.92, zf: -0.46 },
  { xf: 0.58, zf: -0.85 },
  { xf: 0.0, zf: -1.0 },
];

const CHEEK: ProfilePoint[] = [
  { xf: 0.0, zf: 0.96 },
  { xf: 0.44, zf: 0.91 },
  { xf: 0.8, zf: 0.76 }, // cheekbone, forward and wide
  { xf: 0.98, zf: 0.34 },
  { xf: 1.0, zf: -0.06 },
  { xf: 0.92, zf: -0.46 },
  { xf: 0.58, zf: -0.85 },
  { xf: 0.0, zf: -1.0 },
];

const MOUTH: ProfilePoint[] = [
  { xf: 0.0, zf: 1.0 }, // the lips ride slightly proud of the muzzle
  { xf: 0.34, zf: 0.95 },
  { xf: 0.71, zf: 0.66 },
  { xf: 0.95, zf: 0.3 },
  { xf: 1.0, zf: -0.1 },
  { xf: 0.95, zf: -0.5 },
  { xf: 0.6, zf: -0.88 },
  { xf: 0.0, zf: -1.0 },
];

const JAW: ProfilePoint[] = [
  { xf: 0.0, zf: 1.0 },
  { xf: 0.38, zf: 0.92 },
  { xf: 0.72, zf: 0.66 },
  { xf: 0.95, zf: 0.3 },
  { xf: 1.0, zf: -0.1 },
  { xf: 0.95, zf: -0.5 }, // gonial angle, squared off
  { xf: 0.6, zf: -0.88 },
  { xf: 0.0, zf: -1.0 },
];

const CHIN: ProfilePoint[] = [
  { xf: 0.0, zf: 1.0 },
  { xf: 0.46, zf: 0.89 },
  { xf: 0.8, zf: 0.58 },
  { xf: 0.95, zf: 0.2 },
  { xf: 1.0, zf: -0.2 },
  { xf: 0.9, zf: -0.55 },
  { xf: 0.55, zf: -0.88 },
  { xf: 0.0, zf: -1.0 },
];

// Above the brow the sections follow a spherical falloff so the cranium reads
// as a dome rather than a cone.
const SKULL_RINGS: Ring[] = [
  { y: 0.555, w: 0.135, fz: 0.106, bz: 0.16, cz: -0.03 },
  { y: 0.5, w: 0.218, fz: 0.172, bz: 0.258, cz: -0.03 },
  { y: 0.42, w: 0.289, fz: 0.228, bz: 0.342, cz: -0.03 },
  { y: 0.32, w: 0.337, fz: 0.266, bz: 0.399, cz: -0.03 },
  { y: 0.22, w: 0.355, fz: 0.28, bz: 0.42, cz: -0.03 }, // upper forehead
  { y: 0.13, w: 0.355, fz: 0.3, bz: 0.44, cz: -0.03, profile: BROW },
  { y: 0.06, w: 0.353, fz: 0.3, bz: 0.445, cz: -0.03, profile: EYE }, // top of the socket
  { y: 0.0, w: 0.35, fz: 0.3, bz: 0.45, cz: -0.03, profile: EYE_LOW },
  { y: -0.07, w: 0.345, fz: 0.3, bz: 0.44, cz: -0.03, profile: CHEEK }, // cheekbone
  { y: -0.15, w: 0.315, fz: 0.295, bz: 0.42, cz: -0.03 }, // base of the nose
  { y: -0.2, w: 0.3, fz: 0.288, bz: 0.4, cz: -0.03, profile: MOUTH }, // upper lip
  { y: -0.26, w: 0.285, fz: 0.288, bz: 0.39, cz: -0.03, profile: MOUTH }, // lower lip
  { y: -0.32, w: 0.268, fz: 0.268, bz: 0.37, cz: -0.03, profile: JAW }, // under the lip
  { y: -0.38, w: 0.24, fz: 0.262, bz: 0.34, cz: -0.03, profile: JAW },
  { y: -0.44, w: 0.195, fz: 0.235, bz: 0.31, cz: -0.03, profile: CHIN }, // chin
  { y: -0.53, w: 0.115, fz: 0.175, bz: 0.27, cz: -0.04, profile: CHIN }, // under the jaw
];

const NOSE_PROFILE: ProfilePoint[] = [
  { xf: 0.0, zf: 1.0 },
  { xf: 0.78, zf: 0.82 }, // a blunt front plane, not a blade
  { xf: 1.0, zf: 0.1 },
  { xf: 0.9, zf: -1.0 },
];

const NOSE_RINGS: Ring[] = [
  { y: 0.12, w: 0.05, fz: 0.01, bz: 0.13, cz: 0.19 }, // hidden inside the brow
  { y: 0.04, w: 0.055, fz: 0.04, bz: 0.13, cz: 0.19 }, // bridge, barely proud of the socket
  { y: -0.04, w: 0.062, fz: 0.085, bz: 0.13, cz: 0.19 },
  { y: -0.11, w: 0.075, fz: 0.125, bz: 0.13, cz: 0.19 },
  { y: -0.165, w: 0.094, fz: 0.145, bz: 0.13, cz: 0.19 }, // ball of the nose
  // The last section tucks back inside the face so the underside of the nose
  // reads as a plane instead of leaving an open slot.
  { y: -0.21, w: 0.098, fz: 0.05, bz: 0.13, cz: 0.19 },
];

const STAND_RINGS: Ring[] = [
  { y: -0.44, w: 0.12, fz: 0.06, bz: 0.2, cz: -0.09 }, // hidden up inside the jaw
  { y: -0.58, w: 0.155, fz: 0.07, bz: 0.23, cz: -0.09 }, // neck
  { y: -0.78, w: 0.175, fz: 0.085, bz: 0.235, cz: -0.09 },
  { y: -0.95, w: 0.2, fz: 0.135, bz: 0.26, cz: -0.09 }, // into the shoulders
  { y: -1.0, w: 0.44, fz: 0.44, bz: 0.44, cz: -0.06 }, // plinth
  { y: -1.16, w: 0.46, fz: 0.46, bz: 0.46, cz: -0.06 },
];

function eyeball(side: 1 | -1): BufferGeometry {
  const geometry = new IcosahedronGeometry(0.084, 2);
  geometry.applyMatrix4(new Matrix4().makeTranslation(side * 0.146, 0.038, 0.152));
  return geometry;
}

function ear(side: 1 | -1): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 1);
  const transform = new Matrix4()
    .makeTranslation(side * 0.325, -0.05, -0.115)
    .multiply(new Matrix4().makeRotationY(side * -0.3))
    .multiply(new Matrix4().makeScale(0.026, 0.092, 0.058));
  geometry.applyMatrix4(transform);
  return geometry;
}

export interface ProceduralHeadGeometry {
  /** Parts that follow the tracked head pose. */
  head: BufferGeometry[];
  /** Neck and plinth: these stay put while the head turns. */
  stand: BufferGeometry[];
}

export function buildProceduralHead(): ProceduralHeadGeometry {
  const skull = buildLoft(SKULL_RINGS, {
    profile: BASE,
    top: { y: 0.59, z: -0.03 },
    bottom: 'flat',
  });
  const nose = buildLoft(NOSE_RINGS, { profile: NOSE_PROFILE, top: 'flat', bottom: 'flat' });
  const stand = buildLoft(STAND_RINGS, { profile: BASE, top: 'flat', bottom: 'flat' });

  return {
    head: [skull, nose, eyeball(1), eyeball(-1), ear(1), ear(-1)],
    stand: [stand],
  };
}
