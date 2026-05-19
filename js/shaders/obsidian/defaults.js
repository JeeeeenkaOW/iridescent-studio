// =========================================================
// OBSIDIAN DEFAULTS — initial uniform values
// =========================================================
// A dark-glass material inspired by the D20 dice reference: deep
// near-black body with a coloured "attenuation" glow inside thicker
// regions, a sharp clearcoat highlight, and a fresnel rim where the
// surface curves away from the viewer.
//
// Controls exposed:
//   baseColor    — body colour (near-black by default)
//   accentColor  — inner glow / attenuation tint (red by default)
//   accentStrength — how much accent colour shows through
//   refraction   — bg distortion at silhouette edges (lower than glass)
//   fresnel      — strength of the rim highlight (0..1)
//   fresnelPower — sharpness of the rim falloff (1..8)
//
// Lighting preset:
//   Tight, bright specular (high shininess, mid intensity) — the
//   "clearcoat" feel from the dice. Light height is mid-low so the
//   highlight reads as a sharp point catching light.
//
export const defaults = {
  name: 'Obsidian',

  material: {
    baseColor:      '#0E0E10',  // near-black, slight cool
    accentColor:    '#991111',  // dark red, matches dice attenuationColor
    accentStrength: 0.55,       // 0..1
    refraction:     0.04,       // 0..0.2 — small lensing at edges
    fresnel:        0.7,        // 0..1 — rim intensity
    fresnelPower:   4.0,        // 1..8 — rim sharpness
  },

  lighting: {
    diffuse:   0.18,    // low diffuse — material is mostly dark
    specular:  1.4,     // bright specular for clearcoat sheen
    shininess: 80.0,    // tight highlight
    height:    0.12,    // low → highlight stretches with light
  },
};
