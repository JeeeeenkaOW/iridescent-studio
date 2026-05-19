// =========================================================
// MERCURY DEFAULTS — initial uniform values
// =========================================================
// Mercury is a pure material: warm silver base + Blinn-Phong lighting +
// mercury blob at the cursor. No iridescence or chromatic aberration
// here — those are effects (toggle them on in the Effects panel).
//
// `lighting` values become preset defaults for the four lighting
// uniforms every material declares: u_diffuse, u_specular, u_shininess,
// u_lightHeight. The Lighting effect's sliders override these when
// the effect is enabled.
//
export const defaults = {
  name: 'Mercury',

  material: {
    baseColor:  '#C7BDB3',   // warm silver
  },

  // Preset Blinn-Phong lighting for Mercury. Read by the material's
  // lighting block; can be overridden by enabling the Lighting effect.
  lighting: {
    diffuse:   0.45,
    specular:  1.6,
    shininess: 28.0,
    height:    0.16,
  },
};
