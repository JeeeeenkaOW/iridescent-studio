// =========================================================
// IRIDESCENCE — Inigo Quilez cosine palette
// =========================================================
// Given a scalar t, returns an RGB color cycling through the palette.
// Phase vector (u_paletteD) is what makes Pearl/Gold/Oil/Arctic look different.
//
// Reference: https://iquilezles.org/articles/palettes/
//
// The (a, b, c) constants are baked here — they're the same for all current
// presets. If a future preset wants different a/b/c, we'll need to add
// u_palette_a/b/c uniforms.
//
export const iridescenceHelper = /* glsl */ `
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    return a + b * cos(6.28318 * (c * t + u_paletteD));
  }
`;
