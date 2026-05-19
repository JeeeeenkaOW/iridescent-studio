// =========================================================
// CERAMIC DEFAULTS — initial uniform values
// =========================================================
// Bone-white ceramic / porcelain: opaque matte body with a soft
// clearcoat highlight, subtle subsurface translucency on thin
// silhouettes, slight warm cast (real porcelain is rarely pure white).
//
// Realism additions same as the rest: F0 dielectric, hemisphere
// ambient, ACES tonemap.
//
// Subsurface scattering is faked with a soft warm tint mixed into the
// body, scaled by bloom (bloom is highest at the silhouette centre,
// so this reads as "thicker areas glow internally" — like holding
// porcelain up to light).
//
import { AMBIENT_SKY, AMBIENT_GROUND } from '../_shared/ambient.js';

export const defaults = {
  name: 'Ceramic',

  material: {
    baseColor:    '#F4EFE6',  // very warm white
    sssColor:     '#FFE3CC',  // subsurface tint — warmer, slightly orange
    sssStrength:  0.35,       // 0..1, how much the inner glow shows
    f0Color:      '#0E0F11',  // ~0.04 dielectric, very faint cool
  },

  // Ceramic is soft and matte. High diffuse, low specular, low
  // shininess (broad highlight rather than sharp), low light height
  // so the highlight smears across the surface.
  lighting: {
    diffuse:   0.85,   // diffuse-dominant
    specular:  0.6,    // soft spec
    shininess: 24.0,   // broad highlight
    height:    0.22,   // higher light → softer falloff
    color:     '#FFFFFF',
  },

  ambient: {
    sky:    AMBIENT_SKY,
    ground: AMBIENT_GROUND,
  },
};
