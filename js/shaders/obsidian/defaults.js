// =========================================================
// OBSIDIAN DEFAULTS — initial uniform values
// =========================================================
// Dark-glass material inspired by the D20 dice reference: deep
// near-black body with a fresnel rim, sharp clearcoat highlight,
// and a fine procedural surface roughness that breaks up reflections
// into a stippled, "rough volcanic glass" look.
//
// Controls:
//   baseColor    — body colour (near-black by default)
//   refraction   — bg distortion at silhouette edges (lower than glass)
//   fresnel      — strength of the rim highlight (0..1)
//   fresnelPower — sharpness of the rim falloff (1..8)
//   roughness    — strength of the procedural normal perturbation that
//                  breaks up the specular highlight. 0 = smooth glass,
//                  high = stippled obsidian.
//
// Lighting preset:
//   Tight, bright specular (high shininess, mid intensity) — the
//   "clearcoat" feel from the dice. Light height is mid-low so the
//   highlight reads as a sharp point catching light.
//
export const defaults = {
  name: 'Obsidian',

  material: {
    baseColor:    '#0E0E10',  // near-black, slight cool
    refraction:   0.04,       // 0..0.2 — small lensing at edges
    fresnel:      0.7,        // 0..1 — rim intensity
    fresnelPower: 4.0,        // 1..8 — rim sharpness
    roughness:    0.6,        // 0..1 — surface micro-perturbation strength
  },

  lighting: {
    diffuse:   0.18,    // low diffuse — material is mostly dark
    specular:  1.4,     // bright specular for clearcoat sheen
    shininess: 80.0,    // tight highlight
    height:    0.12,    // low → highlight stretches with light
  },
};
