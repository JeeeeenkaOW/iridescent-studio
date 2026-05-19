// =========================================================
// IRIDESCENCE — Inigo Quilez cosine palette, with toggle + tint
// =========================================================
// Given a scalar t, returns an RGB color cycling through the palette.
//
// Phase vector (u_iriPhase) is what makes Pearl/Gold/Oil/Arctic sub-presets
// look different. Color tint (u_iriColor + u_iriColorStrength) shifts the
// palette toward a hex pick. Intensity (u_iriIntensity) blends the
// iridescent palette toward neutral white — at 0.0 the material loses
// all iridescence and the composite produces just the base silver
// (with lighting).
//
// At u_iriIntensity=1.0 and u_iriColorStrength=0.0 with Pearl phase
// (0.0, 0.18, 0.42) the output is byte-identical to the original
// Pearl shader.
//
// Reference: https://iquilezles.org/articles/palettes/
//
export const iridescenceHelper = /* glsl */ `
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 rainbow = a + b * cos(6.28318 * (c * t + u_iriPhase));

    // Color tint: blend the rainbow toward (rainbow * u_iriColor).
    // u_iriColorStrength = 0 leaves rainbow untouched.
    vec3 tinted = mix(rainbow, rainbow * u_iriColor, u_iriColorStrength);

    // Intensity: blend toward neutral white. At 0 the material is
    // pure base silver; at 1 it's full iridescence.
    return mix(vec3(1.0), tinted, u_iriIntensity);
  }
`;
