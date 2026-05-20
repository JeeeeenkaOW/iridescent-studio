// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Pearl-cosine palette tints the specular highlight AND the silhouette
// halo glow. The result is a multi-hue iridescent surface where:
//   - the Fresnel-lit highlights pick up pink/cyan/violet
//   - the bloom-driven glow around the ornament edges + bright interior
//     details gets a flowing rainbow ring
//
// What changed: previous version capped the highlight tint at the
// palette's natural luminance and the halo coefficient at 0.32. That
// produced a subtle sheen — nowhere near the vivid rainbow look the
// reference image needed. Now:
//   - `iriT` drives the palette as before, but the OUTPUT of
//     `iridescence()` is overdriven by `(1 + intensity)` at intensity ≥ 1
//     so the specular tint goes HDR and ACES tonemaps to saturated
//     colour (instead of just shifted hue).
//   - The halo coefficient is now `intensity` (was 0.32 hardcoded) so
//     a maxed-out intensity slider produces a strong rainbow ring.
//   - The slider range is extended to 0..200% (in controls.js), so
//     `u_iriIntensity` can go to 2.0 for the truly vivid look from the
//     reference. The body diffuse is left untouched (user choice).
//
// Time drift: deliberately omitted from `iriT` for the highlight tint
// so hues stay anchored to surface position. The halo's iriT does
// include time so the ring flows around the silhouette.
//
// Host material contract:
//   - declare `vec3 specular` (Fresnel-coloured) before EFFECTS_APPLY
//   - declare `vec3 halo = vec3(0.0)` in haloBlock
//   - declare `float haloMask` in haloBlock
//   - reads available: `iriT`, `flow`, `u_time`, `u_iriIntensity`,
//     `u_iriPhase`
//
export const uniforms = /* glsl */ `
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const helpers = /* glsl */ `
  // Pearl-cosine palette (IQ cosine palette + Pearl basis from defaults).
  // Always returns the raw palette regardless of intensity — used by
  // Bloom too. Range is roughly [0..1] per channel.
  vec3 iridescencePalette(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    return a + b * cos(6.28318 * (c * t + u_iriPhase));
  }

  // Tint function for: specular *= iridescence(iriT).
  // At intensity = 0: returns vec3(1.0) (no-op, specular unchanged).
  // At intensity = 1: returns palette (specular fully takes palette hue).
  // At intensity > 1: returns palette boosted above 1.0 (HDR push so
  //                   ACES tonemapping turns the highlight into a
  //                   saturated bright rainbow instead of just hue-shifted).
  vec3 iridescence(float t){
    vec3 rainbow = iridescencePalette(t);
    float k = clamp(u_iriIntensity, 0.0, 2.0);
    // 0..1 — lerp from white to palette.
    // 1..2 — keep palette but push amplitude (1 + (k-1)) = k.
    vec3 base = mix(vec3(1.0), rainbow, min(k, 1.0));
    float overdrive = max(k - 1.0, 0.0);
    return base * (1.0 + overdrive * 1.5);
  }
`;

// Apply: tint the highlight and write the halo ring.
//   - `specular *= iridescence(iriT)` — multi-hue across the surface
//     because iriT varies spatially. With the new overdrive, at
//     intensity > 1 the specular runs HDR and the tonemap converts
//     it to vivid saturated colour.
//   - `halo = palette * haloMask * intensity` — the ring is now scaled
//     directly by intensity (was a fixed 0.32). At intensity=2 the ring
//     is roughly 6× brighter than the old maxed-out version.
//
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      specular *= iridescence(iriT);
      vec3 haloRainbow = iridescencePalette(u_time * 0.06 + flow * 0.4 + 0.25);
      // Halo coefficient scales with intensity so the slider is the
      // single knob for "how vivid is the iridescence look".
      halo = haloRainbow * haloMask * u_iriIntensity;
    }
`;
