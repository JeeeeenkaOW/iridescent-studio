// =========================================================
// MERCURY DEFAULTS — initial uniform values
// =========================================================
// Mercury is a pure material: warm silver base + Blinn-Phong lighting
// + mercury blob at the cursor. Iridescence and chromatic aberration
// are effects (toggle in the Effects panel).
//
// Realism pass adds:
//   - Fresnel reflectance via Schlick (F0 metallic high — mercury is a metal)
//   - Hemisphere ambient (sky/ground tint)
//   - ACES tonemapping in output block
//
import { AMBIENT_SKY, AMBIENT_GROUND } from '../_shared/ambient.js';

export const defaults = {
  name: 'Mercury',

  material: {
    baseColor:  '#C7BDB3',   // warm silver
    // F0: reflectance at normal incidence. Metals are 0.7–1.0+.
    // We use a coloured F0 (silver tints reflections slightly warm)
    // so the Fresnel rim picks up the right metal hue.
    f0Color:    '#E8DDC8',   // slightly warm silver F0
  },

  // Preset Blinn-Phong lighting for Mercury. Read by the material's
  // lighting block; can be overridden by enabling the Lighting effect.
  lighting: {
    diffuse:   0.45,
    specular:  1.6,
    shininess: 28.0,
    height:    0.16,
    color:     '#FFFFFF',
  },

  ambient: {
    sky:    AMBIENT_SKY,
    ground: AMBIENT_GROUND,
  },
};
