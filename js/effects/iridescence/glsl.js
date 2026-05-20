// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Replaces the specular highlight's hue with a cosine-palette
// rainbow while preserving its luminance. The hue this pixel lands
// on is driven by iriT — a STATIC (no-time) field that combines:
//   - NdotL (cursor angle relative to surface normal) — the
//     dominant term, so moving the cursor shifts the apparent
//     palette index across the highlight. This is the oil-on-water
//     effect: lighting angle changes the colour.
//   - fbm noise of texUV — gives spatial variation so different
//     areas of the surface read as different colours at the same
//     cursor position.
//   - cursor blob bump — pushes iriT further when the cursor blob
//     is over a region.
//
// What this effect DOES NOT do (as of v12):
//   - It does NOT write the halo. Previously it wrote a rainbow
//     halo ring whenever iridescence was enabled, which surprised
//     users who toggled it expecting "tint the highlight" and got
//     "tint + glow". Halo is now exclusively Bloom's job — and
//     Bloom multiplies its halo by `iridescence(t)` so the halo
//     IS rainbow-tinted when both effects are on.
//   - It does NOT tint the diffuse body. v11 tried adding a
//     `bodyTint` mean-zero palette overlay; the user explicitly
//     rejected that look in favour of the pure spec-tint look.
//
// Host material contract:
//   - declare `vec3 specular` (Fresnel-coloured) before EFFECTS_APPLY
//   - declare `vec3 halo = vec3(0.0)` and `float haloMask` in haloBlock
//   - `iriT` — surface field for the palette lookup
//   - `flow` — time-drifting field (used by Bloom's halo)
//
export const uniforms = /* glsl */ `
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const helpers = /* glsl */ `
  // Pearl-cosine palette (IQ cosine palette + Pearl basis).
  // Range roughly [0..1] per channel.
  vec3 iridescencePalette(float t){
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    return a + b * cos(6.28318 * (c * t + u_iriPhase));
  }

  // Multiplicative tint — used by Bloom for the halo. Returns
  // vec3(1.0) at intensity=0 so multiplying is a no-op.
  vec3 iridescence(float t){
    float k = clamp(u_iriIntensity, 0.0, 2.0);
    vec3 palette = iridescencePalette(t);
    return mix(vec3(1.0), palette, min(k, 1.0));
  }

  // Replace the spec's hue with the palette while preserving its
  // luminance. At intensity=0 the spec is unchanged; at intensity=1
  // the spec's hue is fully palette (same brightness); at intensity=2
  // the spec is palette AND boosted brightness for HDR push.
  vec3 tintSpecular(vec3 spec, float t){
    float k = clamp(u_iriIntensity, 0.0, 2.0);
    if (k < 0.001) return spec;
    vec3 palette = iridescencePalette(t);
    float lum = dot(spec, vec3(0.2126, 0.7152, 0.0722));
    vec3 tinted = palette * lum * 1.6;
    vec3 base = mix(spec, tinted, min(k, 1.0));
    float overdrive = max(k - 1.0, 0.0);
    return base * (1.0 + overdrive * 1.5);
  }
`;

// Apply: tint the spec ONLY. No halo write — that's Bloom's job.
//
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      specular = tintSpecular(specular, iriT);
    }
`;
