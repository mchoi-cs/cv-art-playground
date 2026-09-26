/**
 * Classic portrait lighting setups.
 *
 * The angles are the traditional starting points, not gospel - the whole
 * point of the demo is to nudge them and watch what happens to the planes.
 */

import type { LightState } from './lighting';

export interface LightingPreset {
  id: string;
  name: string;
  /** One line of "what am I looking at" for the tooltip. */
  note: string;
  values: Partial<LightState>;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    note: 'Key 45° to the side and 45° up: a small lit triangle on the shadow-side cheek.',
    values: { azimuth: 44, elevation: 44, intensity: 1.7, fill: 0.1, rim: 0, softness: 0.6 },
  },
  {
    id: 'split',
    name: 'Split',
    note: 'Key straight out to the side at eye level: one half lit, one half in shadow.',
    values: { azimuth: 90, elevation: 6, intensity: 1.7, fill: 0.07, rim: 0, softness: 0.5 },
  },
  {
    id: 'loop',
    name: 'Loop',
    note: 'A softer three-quarter key: the nose shadow loops down the cheek but stays separate.',
    values: { azimuth: 32, elevation: 28, intensity: 1.6, fill: 0.16, rim: 0, softness: 0.7 },
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    note: 'Key dead in front and high: a small symmetrical shadow under the nose.',
    values: { azimuth: 0, elevation: 58, intensity: 1.7, fill: 0.14, rim: 0, softness: 0.7 },
  },
  {
    id: 'rim',
    name: 'Rim / back',
    note: 'Key behind the head: the form reads as a bright edge against darkness.',
    values: { azimuth: 154, elevation: 30, intensity: 2.4, fill: 0.05, rim: 0.5, softness: 0.8 },
  },
  {
    id: 'under',
    name: 'Under light',
    note: 'Key below eye level: every plane flips, which is why it reads as uncanny.',
    values: { azimuth: 14, elevation: -42, intensity: 1.5, fill: 0.08, rim: 0, softness: 0.65 },
  },
  {
    id: 'top',
    name: 'Top light',
    note: 'Key almost overhead: deep eye sockets and a shadow under the nose and chin.',
    values: { azimuth: 6, elevation: 80, intensity: 1.8, fill: 0.08, rim: 0, softness: 0.7 },
  },
];
