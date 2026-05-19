// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Two pieces, slotted into the host shader at different points:
//
//   uniforms  — declared in the host shader's uniform prelude
//   helpers   — `iridescence(t)` function + a flow FBM term, injected
//               into the prelude after noise helpers
//   apply     — runs in main() after the material has produced its
//               baseline `specular` (vec3) and `iriT` (float) values.
//               Tints specular with the cosine palette.
//
// The contract a host material must honour:
//   - declare `vec3 specular` (the unmultiplied specular contribution)
//   - declare `float iriT`   (the palette input, usually NdotL + flow)
// After the apply block, `specular` carries iridescent colour and the
// composite step can add it to diffuse as normal.
//
export const uniforms = /* glsl */ `
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const helpers = /* glsl */ `
  // IQ cosine palette. u_iriIntensity blends toward neutral white,
  // so an effect-level intensity of 0 means the helper returns
  // (1,1,1) — no tint applied even if the apply block still runs.
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 rainbow = a + b * cos(6.28318 * (c * t + u_iriPhase));
    return mix(vec3(1.0), rainbow, u_iriIntensity);
  }
`;

// Injected into main() at the EFFECTS_APPLY slot. By this point the
// material has defined `specular`, `iriT`, `bloom`, `mask`, `flow`,
// `v_uv`, and `u_time`. We:
//   - tint the existing specular by the palette
//   - re-tint the halo around silhouette edges (bloom-driven) so
//     the rim picks up colour too — matches the original Mercury feel.
//     The host material sets `halo` (vec3) in its baseline; we modify it.
export const apply = /* glsl */ `
    vec3 iriCol = iridescence(iriT);
    specular *= iriCol;
    halo = iridescence(u_time * 0.06 + flow * 0.4 + 0.25) * haloMask * haloIntensity;
`;
