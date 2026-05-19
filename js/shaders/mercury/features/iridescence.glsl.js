// =========================================================
// IRIDESCENCE — Inigo Quilez cosine palette
// =========================================================
// Given a scalar t, returns an RGB color cycling through the palette.
//
// u_iriPhase   — phase vector controlling which colors the rainbow
//                cycles through. Driven by the Hue slider in controls.
//                Same offset added to all three channels = clean
//                rotation around the color wheel while preserving
//                the Pearl basis's channel separation.
//
// u_iriIntensity — blends the rainbow toward neutral white. At 0.0
//                the material is pure base material with no iridescence;
//                at 1.0 it's the full cosine palette. Driven by both
//                the Intensity slider and the on/off toggle (toggle
//                forces 0.0 when off).
//
// At u_iriIntensity=1.0 with hue=0 (Pearl basis 0.0, 0.18, 0.42)
// the palette matches the original Pearl shader.
//
// Reference: https://iquilezles.org/articles/palettes/
//
export const iridescenceHelper = /* glsl */ `
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 rainbow = a + b * cos(6.28318 * (c * t + u_iriPhase));
    return mix(vec3(1.0), rainbow, u_iriIntensity);
  }
`;
