// =========================================================
// BLOOM EFFECT — GLSL
// =========================================================
// Owns the silhouette halo. Each material provides:
//   - `haloMask`        — bloom * (1 - mask*0.7), set in haloBlock
//   - `u_haloBaseColor` — material's default tint (uniform)
//   - `u_haloBaseIntensity` — material's tuned baseline intensity
//   - `halo` (vec3)     — initially set to vec3(0.0) by haloBlock
//
// The apply block writes `halo` in-place. Compositing/output already
// reads `halo` after the EFFECTS_APPLY slot. When the effect is
// disabled (u_bloomStrength == 0), halo stays at zero — i.e. no
// glow. When enabled, halo = chosenColor * haloMask * baseIntensity
// * strength, optionally tinted by iridescence.
//
// Color selection:
//   - User hasn't picked a color (u_bloomUserColor == 0) → use the
//     material's u_haloBaseColor.
//   - User picked → use u_bloomColor.
// Then multiplied by iridescence(...) so it picks up the rainbow
// when iridescence is on (iridescence() returns vec3(1) when off,
// so this is a no-op in that case).
//
// Effect order: bloom MUST run after iridescence in the EFFECTS_APPLY
// slot so iridescence(...) can be called here. See /effects/index.js.
//
export const uniforms = /* glsl */ `
  uniform float u_bloomStrength;
  uniform vec3  u_bloomColor;
  uniform float u_bloomUserColor;
`;

export const helpers = ``;

export const apply = /* glsl */ `
    if (u_bloomStrength > 0.001) {
      vec3 bloomBase = mix(u_haloBaseColor, u_bloomColor, u_bloomUserColor);
      // Animated iridescence tint — returns vec3(1.0) when iridescence
      // is disabled (u_iriIntensity == 0), so this is neutral by default.
      vec3 bloomTint = iridescence(u_time * 0.06 + flow * 0.4 + 0.25);
      halo = bloomBase * bloomTint * haloMask * u_haloBaseIntensity * u_bloomStrength;
    }
`;
