// =========================================================
// MERCURY DEFAULTS — initial uniform values
// =========================================================
// Two control groups:
//
//   material:    Blinn-Phong lighting parameters. Honest labels —
//                the shader is Blinn-Phong, not real PBR, so we
//                expose what the math actually does.
//
//   iridescence: cosine-palette rainbow on the specular highlight.
//                Hue is a 0..360° rotation of the palette phase
//                (replaces the old Pearl/Gold/Oil/Arctic buttons).
//                Intensity blends toward neutral white.
//
// At iridescence.enabled=true, intensity=1.0, hue=0, the output
// is byte-identical to the original Pearl shader.
//
export const defaults = {
  name: 'Mercury',

  material: {
    baseColor:  '#C7BDB3',   // warm silver (0.78, 0.74, 0.70)
    diffuse:    0.45,        // diffuse gain (0..1)
    specular:   1.6,         // specular intensity (0..3)
    shininess:  28.0,        // specular exponent (1..128, higher = tighter highlight)
  },

  iridescence: {
    enabled:    true,
    intensity:  1.0,         // 0..1, 1 = full rainbow
    hue:        0,           // 0..360°, rotates the cosine palette
  },
};

// Pearl-phase basis. The hue slider adds (hue/360°) to all three
// channels of this vector, rotating the cosine palette through
// the full color wheel while preserving Pearl's color separation.
// At hue=0 we get the original Pearl phase.
export const PEARL_BASIS = [0.00, 0.18, 0.42];
