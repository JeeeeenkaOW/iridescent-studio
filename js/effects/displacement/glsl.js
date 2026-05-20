// =========================================================
// DISPLACEMENT EFFECT — GLSL (heat-haze UV warp)
// =========================================================
// Warps the silhouette by re-sampling u_albedo (for mask) and u_bloom
// (for halo) at a noise-offset UV. The lighting math already ran
// before EFFECTS_APPLY so highlights stay in place — only the SHAPE
// of the silhouette ripples, like heat coming off hot metal.
//
// Two animated noise octaves drive the offset:
//   - Low frequency (broad ripples)
//   - Higher frequency (fine wobble)
// Both drift over time. Different drift speeds per axis stop the
// pattern from looking like it scrolls in one direction.
//
// Why re-sample instead of trying to modify N? Because lighting has
// already happened (NdotL, NdotV, spec) by the time EFFECTS_APPLY
// runs. Re-sampling N here would mean throwing away lighting and
// redoing it inline, which is expensive AND would conflict with the
// other effects' assumption that `specular` / `halo` already reflect
// the lit body. So we ripple only what's safe to ripple post-lighting:
// `mask` (silhouette presence) and `bloom` (halo source).
//
// Strength slider 0..100% → u_dispStrength 0..0.04 (UV offset in
// normalized image-UV space). 0.04 is roughly 4% of the texture
// width — generous but not so much that the ornament disappears.
//
// Effect order: runs BEFORE Bloom (so Bloom sees the warped halo
// source) and BEFORE CA (which rewrites mask in its own way).
//
export const uniforms = /* glsl */ `
  uniform float u_dispStrength;
  uniform float u_dispScale;
  uniform float u_dispSpeed;
`;

export const helpers = ``;

export const apply = /* glsl */ `
    if (u_dispStrength > 0.0001) {
      // Two FBM octaves at different frequencies + drift speeds.
      // Independent per-axis time terms break left-right symmetry.
      // loopTime2D yields linear drift normally, and a periodic
      // sin/cos circle when u_loopMode=1 so the warp pattern is
      // perfectly periodic for video export.
      vec2 dUV1 = texUV * u_dispScale          + loopTime2D(0.13 * u_dispSpeed,  0.09 * u_dispSpeed);
      vec2 dUV2 = texUV * u_dispScale * 2.3    + loopTime2D(-0.17 * u_dispSpeed, 0.21 * u_dispSpeed);
      // Center the noise around 0 so the offset can go in either
      // direction (otherwise the silhouette only drifts one way).
      float dx = (fbm(dUV1) - 0.5) + (fbm(dUV2 + vec2(7.1, 3.3)) - 0.5) * 0.5;
      float dy = (fbm(dUV1 + vec2(9.7, 2.1)) - 0.5) + (fbm(dUV2) - 0.5) * 0.5;
      vec2 dispOffset = vec2(dx, dy) * u_dispStrength;

      // Re-sample albedo + bloom at the warped UV. Use the clamped
      // sUV bounds to avoid edge wrap artifacts.
      vec2 warpedUV = clamp(texUV + dispOffset, vec2(0.001), vec2(0.999));
      vec3 warpedAlbedo = texture2D(u_albedo, warpedUV).rgb;
      float warpedBloom = texture2D(u_bloom,  warpedUV).r;

      // Overwrite mask + bloom so downstream effects (Bloom for halo,
      // CA for the fringe) see the rippled silhouette. Don't touch
      // ornament-bound vars like specular — those were already
      // computed against the un-warped surface and would look weird
      // (lit highlights drifting out of the body shape).
      mask  = max(max(warpedAlbedo.r, warpedAlbedo.g), warpedAlbedo.b);
      bloom = warpedBloom;
      // Recompute haloMask so the bloom effect's ring also wobbles.
      haloMask = bloom * (1.0 - mask * 0.7);
    }
`;
