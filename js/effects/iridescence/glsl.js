// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Pearl-cosine palette tints the specular highlight AND the silhouette
// halo glow. The result is a multi-hue iridescent surface where:
//   - the Fresnel-lit highlights pick up pink/cyan/violet
//   - the bloom-driven glow around the ornament edges + bright interior
//     details (like fine engraving) gets a flowing rainbow ring
// Together these produce the soft "pearl/oil-slick" look that varies
// across the ornament — different parts hold different hues at once
// because `iriT` varies spatially with NdotL, flow noise, and texUV.
//
// Distinction from the previous (rejected) approach: that one tried a
// localized multiplicative tint via `iriTint`. The OG approach (which
// this restores) modifies `specular` and `halo` directly. It's the
// look the user wanted back.
//
// Time drift: deliberately omitted from `iriT` (see each material's
// flow-fbm.glsl.js). The OG had `+ u_time * 0.04` which cycled the
// dominant hue through the rainbow every ~25s — that "constant hue
// change of the entire model" is the part we DON'T want. Without it,
// hues are anchored to surface position and only shift when the
// cursor moves (NdotL changes) or via slow flow-noise drift.
//
// Two pieces in the host shader:
//
//   helpers — `iridescence(t)` (white when off, rainbow when on)
//             `iridescencePalette(t)` (always raw rainbow — kept for
//             Bloom's halo tint when both effects are on)
//
//   apply   — modifies `specular` (multiply by palette) and writes
//             `halo` (rainbow ring/glow). Both vars are declared by
//             the host material before EFFECTS_APPLY.
//
// Bloom interaction: Bloom's apply runs AFTER iridescence and
// unconditionally writes `halo` when its strength > 0. If both are on,
// Bloom replaces iridescence's halo with its own (still rainbow-tinted
// since Bloom multiplies by `iridescence(...)` internally). If only
// iridescence is on, the iridescent halo here is what shows.
//
// Host material contract:
//   - declare `vec3 specular` (Fresnel-coloured spec — already done)
//   - declare `vec3 halo = vec3(0.0)` in haloBlock (already done)
//   - declare `float haloMask` in haloBlock (already done)
//   - reads available: `iriT`, `flow`, `mask`, `u_time`, `u_iriIntensity`,
//     `u_iriPhase`
//
export const uniforms = /* glsl */ `
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const helpers = /* glsl */ `
  // Pearl-cosine palette (IQ cosine palette + Pearl basis from defaults).
  // At u_iriIntensity=0 returns vec3(1.0) — neutral white, so multiplying
  // specular by this is a no-op when the effect is disabled.
  vec3 iridescence(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 rainbow = a + b * cos(6.28318 * (c * t + u_iriPhase));
    return mix(vec3(1.0), rainbow, u_iriIntensity);
  }

  // Raw palette — always returns the rainbow regardless of intensity.
  // Used by Bloom's halo tint so it picks up rainbow even when
  // iridescence intensity is low.
  vec3 iridescencePalette(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    return a + b * cos(6.28318 * (c * t + u_iriPhase));
  }
`;

// Apply: same shape as the OG iridescence effect.
//   - `specular *= iridescence(iriT)` tints the existing highlight.
//     Since `iriT` varies spatially across the surface, different
//     pixels of the highlight see different palette colors → multi-hue
//     distribution on Mercury's wide silver spec.
//   - `halo = iridescence(...) * haloMask * 0.32` — recreates the OG
//     halo intensity (was hardcoded to 0.32 in Mercury's haloBlock).
//     The halo's iriT uses time and flow but not NdotL, so it's a
//     flowing rainbow ring around the silhouette + a soft rainbow
//     glow on bloom-bright interior details (e.g. engraving lines).
//
// The 0.32 halo coefficient matches the OG Mercury intensity. Other
// materials' baseline halos were dimmer (ceramic 0.20, glass 0.25,
// obsidian 0.18) but for the iridescent ring we use Mercury's value
// universally — the iridescence effect IS the dramatic look the
// user wants on all materials.
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      specular *= iridescence(iriT);
      halo = iridescence(u_time * 0.06 + flow * 0.4 + 0.25) * haloMask * 0.32;
    }
`;
