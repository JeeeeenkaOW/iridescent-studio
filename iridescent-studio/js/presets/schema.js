// =========================================================
// MATERIAL SCHEMA
// =========================================================
// A "material" is the complete look of the iridescent shader.
// Every preset (pearl.js, gold.js, etc.) exports an object of this shape.
// When the user picks a material in the sidebar, every uniform in the
// shader gets updated from these values.
//
// Each cluster (palette, base, specular, etc.) maps to one shader feature
// file in /js/shader/features/.
//
// =========================================================
//
// {
//   name:     'Pearl',                         // shown on the button
//
//   palette: {                                  // iridescence.glsl.js
//     a:     [r,g,b],   // bias    (usually 0.5)
//     b:     [r,g,b],   // amplitude (usually 0.5)
//     c:     [r,g,b],   // frequency (usually 1.0)
//     phase: [r,g,b],   // phase offset — this is what gives each preset its color
//   },
//
//   base: {                                     // lighting.glsl.js
//     color:          [r,g,b],  // diffuse "metal" color under the iridescence
//     diffuseAmbient: 0..1,     // base lit-ness even with no light
//     diffuseGain:    0..1,     // how much NdotL contributes
//   },
//
//   specular: {                                 // lighting.glsl.js
//     power:          1..128,   // shininess exponent (bigger = sharper highlight)
//     intensity:      0..3,     // how bright the highlight is
//     lightModeBoost: 0..2,     // extra boost in parchment mode
//   },
//
//   flow: {                                     // flow-fbm.glsl.js
//     scale:    0..8,           // FBM zoom
//     speed1:   [x,y],          // first octave drift
//     speed2:   [x,y],          // second octave drift
//     weight1:  0..1,           // first octave contribution to iridescence T
//     weight2:  0..1,           // second octave contribution to iridescence T
//   },
//
//   halo: {                                     // halo.glsl.js
//     intensityDark:    0..1,   // halo brightness on dark void
//     intensityLight:   0..1,   // halo brightness on parchment
//     maskFalloffDark:  0..1,   // how much the ornament eats into the halo (dark)
//     maskFalloffLight: 0..1,   // how much the ornament eats into the halo (light)
//     tintOffset:       0..1,   // phase offset for halo tint vs ornament
//   },
//
//   metaball: {                                 // metaball.glsl.js
//     radius:     0..0.5,       // blob size at cursor
//     falloff:    0..0.2,       // edge softness
//     tailLength: 0..1,         // how far the velocity tail stretches
//     tailWidth:  0..0.2,       // tail thickness
//     caStrength: 0..0.02,      // chromatic aberration inside blob
//   },
//
//   vignette: {                                 // vignette.glsl.js
//     innerDark:  0..1,         // vignette inner radius (dark mode)
//     outerDark:  0..2,         // vignette outer radius (dark mode)
//     innerLight: 0..1,         // vignette inner radius (light mode)
//     outerLight: 0..2,         // vignette outer radius (light mode)
//   },
//
//   grain: {                                    // grain.glsl.js
//     dark:  0..0.05,           // grain amount in dark mode
//     light: 0..0.05,           // grain amount in light mode
//   },
// }
//
// =========================================================
//
// DEFAULTS — every preset starts from this base and overrides only what differs.
// These values match the original artifact.html shader behavior exactly.
//
export const DEFAULTS = {
  palette: {
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 1.0],
    phase: [0.0, 0.18, 0.42],
  },
  base: {
    color: [0.78, 0.74, 0.70],
    diffuseAmbient: 0.18,
    diffuseGain: 0.45,
  },
  specular: {
    power: 28.0,
    intensity: 1.6,
    lightModeBoost: 1.35,
  },
  flow: {
    scale: 2.4,
    speed1: [0.025, 0.018],
    speed2: [-0.04, 0.03],
    weight1: 0.35,
    weight2: 0.20,
  },
  halo: {
    intensityDark: 0.32,
    intensityLight: 0.10,
    maskFalloffDark: 0.7,
    maskFalloffLight: 0.85,
    tintOffset: 0.25,
  },
  metaball: {
    radius: 0.22,
    falloff: 0.04,
    tailLength: 0.35,
    tailWidth: 0.05,
    caStrength: 0.006,
  },
  vignette: {
    innerDark: 0.35,
    outerDark: 1.15,
    innerLight: 0.65,
    outerLight: 1.25,
  },
  grain: {
    dark: 0.018,
    light: 0.012,
  },
};

// Deep merge for presets — overrides nest into defaults
export function mergeMaterial(overrides) {
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = { ...DEFAULTS[key], ...(overrides[key] || {}) };
  }
  return out;
}
