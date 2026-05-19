// =========================================================
// OBSIDIAN DEFAULTS — initial uniform values
// =========================================================
// Dark-glass material inspired by the D20 dice reference: near-black
// body with a procedural rough surface, sharp clearcoat highlight,
// and a fresnel rim.
//
// Realism pass:
//   - F0 dielectric (0.04) tinted slightly cool — natural obsidian
//     has a slight blue-grey reflectance cast.
//   - Hemisphere ambient (subtle on a dark body but lifts the
//     silhouette away from pure flat black).
//   - ACES tonemap (mostly relevant when Lighting effect pushes spec).
//
import { AMBIENT_SKY, AMBIENT_GROUND } from '../_shared/ambient.js';

export const defaults = {
  name: 'Obsidian',

  material: {
    baseColor:    '#0E0E10',  // near-black, slight cool
    refraction:   0.04,
    fresnel:      0.7,        // user-facing fresnel intensity (separate from F0)
    fresnelPower: 4.0,
    roughness:    0.6,
    f0Color:      '#0C0F14',  // ~0.04, slight cool cast
  },

  lighting: {
    diffuse:   0.18,
    specular:  1.4,
    shininess: 80.0,
    height:    0.12,
    color:     '#FFFFFF',
  },

  ambient: {
    sky:    AMBIENT_SKY,
    ground: AMBIENT_GROUND,
  },
};
