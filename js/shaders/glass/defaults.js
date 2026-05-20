// =========================================================
// GLASS DEFAULTS — initial uniform values
// =========================================================
// Refraction-based material: bg sampled with normal-driven UV offset,
// optionally frosted. Realism pass adds Schlick Fresnel (real glass
// is very reflective at grazing angles — this is the single thing
// missing from the original look), hemisphere ambient, ACES tonemap.
//
// F0 for dielectrics (glass, water, plastic) is ~0.04. We tint it
// very faintly cool to give the reflections a "real glass" cast.
//
import { AMBIENT_SKY, AMBIENT_GROUND } from '../_shared/ambient.js';

export const defaults = {
  name: 'Glass',

  material: {
    transparency: 0.85,
    refraction:   0.06,
    frost:        0.0,
    f0Color:      '#0B0E12',   // ~0.04 with faint cool cast
  },

  lighting: {
    diffuse:         0.0,
    specular:        0.9,
    shininess:       48.0,
    height:          0.16,
    color:           '#FFFFFF',
    ambientStrength: 1.0,
  },

  ambient: {
    sky:    AMBIENT_SKY,
    ground: AMBIENT_GROUND,
  },
};
