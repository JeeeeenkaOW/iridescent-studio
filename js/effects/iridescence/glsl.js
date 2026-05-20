// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Soap-film thin-film rainbow that rides OVER the lit material —
// without retinting the body or the highlight. The material's own
// colors (base, diffuse, specular, ambient) are preserved; this
// effect adds a purely additive rainbow that's strongest at
// grazing angles, matching how real thin-film interference behaves.
//
// Two pieces in the host shader:
//
//   helpers — `iridescence(t)` (white when off, rainbow when on —
//             used by Mercury composite and by Bloom for tinting)
//           — `iridescencePalette(t)` (always returns the raw
//             rainbow regardless of intensity — used here for the
//             soap-film overlay)
//
//   apply   — writes `iriOverlay` (vec3) — each material's
//             composite block adds it to `ornament` at the end.
//             Zero when the effect is off, so adding it is a no-op
//             in that case.
//
// Host material contract:
//   - declare `vec3 iriOverlay = vec3(0.0);` in haloBlock (already
//     done — see each material's output.glsl.js)
//   - in composite, add `ornament += iriOverlay;` at the end
//   - reads available in apply scope: `iriT`, `flow`, `mask`,
//     `NdotV`, `u_time`, `u_iriIntensity`, `u_iriPhase`
//
export const uniforms = /* glsl */ `
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const helpers = /* glsl */ `
  // White-blended palette. At u_iriIntensity=0 returns vec3(1.0).
  // Used by Mercury's composite blob iridescence and by Bloom for
  // tinting the halo when iridescence is on.
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 rainbow = a + b * cos(6.28318 * (c * t + u_iriPhase));
    return mix(vec3(1.0), rainbow, u_iriIntensity);
  }

  // Raw cosine palette — always returns the rainbow regardless of
  // intensity. Used by the soap-film overlay so its strength can be
  // controlled separately via u_iriIntensity as an *additive* weight.
  vec3 iridescencePalette(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    return a + b * cos(6.28318 * (c * t + u_iriPhase));
  }
`;

// Soap-film overlay. The math:
//   - `iridescencePalette(iriT)` ∈ [0,1] per channel — the raw rainbow
//   - weight by (1 - NdotV)^1.2 so the film is strongest at grazing
//     angles, faint head-on — matches real soap-bubble behavior
//   - weight by `mask` so the overlay only appears on the ornament,
//     not on the background
//   - intensity scales the whole overlay
//   - the *0.7 final factor keeps the default intensity=1.0 visible
//     but not blown out; tonemap handles any peak that does push high
//
// Purely additive — material colors are preserved, the soap film
// brightens with rainbow stripes (driven by `iriT` which mixes NdotL,
// flow noise, time, and texUV) but never darkens. When u_iriIntensity
// is 0 the overlay stays at zero, since we guard the whole block.
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      vec3 rainbow = iridescencePalette(iriT);
      float grazing = pow(1.0 - NdotV, 1.2);
      iriOverlay = rainbow * grazing * mask * u_iriIntensity * 0.7;
    }
`;
