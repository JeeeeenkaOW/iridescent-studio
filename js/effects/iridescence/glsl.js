// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Cosine-palette rainbow tint on the specular highlight and the
// silhouette halo.
//
// v8 redesign — what changed and why:
//   - Previous (v7) MULTIPLIED specular by the palette: bright spec
//     × rainbow → tonemap clipped to white because the spec was
//     already bright. Net effect = whitish sheen, not vivid colour.
//   - v8 REPLACES the specular's hue while preserving its luminance.
//     The rainbow palette fully dominates the spec hue at intensity=1,
//     and an HDR brightness boost kicks in at >100%. The lit surface
//     keeps its specular SHAPE (Fresnel + cursor falloff) but now
//     reads as pure rainbow where the highlight lives.
//   - iriT is sampled from a STATIC noise field (computed in
//     flow-fbm.glsl.js with no time drift), so the material's hue
//     pattern is anchored to surface position. Only the halo's
//     animated time-driven term keeps moving — that's appropriate
//     for the soft glow ring, not for the on-body tint.
//
// Host material contract:
//   - declare `vec3 specular` (Fresnel-coloured) before EFFECTS_APPLY
//   - declare `vec3 halo = vec3(0.0)` and `float haloMask` in haloBlock
//   - `iriT` is the static surface-position field (no time)
//   - `flow` is the time-drifting field (used by the halo, not spec)
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

  // Multiplicative tint — used by Bloom for the halo (which is not
  // a metallic specular, it's a soft glow on its own colour). Returns
  // vec3(1.0) at intensity=0 so multiplying is a no-op.
  vec3 iridescence(float t){
    float k = clamp(u_iriIntensity, 0.0, 2.0);
    vec3 palette = iridescencePalette(t);
    return mix(vec3(1.0), palette, min(k, 1.0));
  }

  // Tint the specular: replace its hue with the palette while
  // preserving its luminance. At intensity=0 the spec is unchanged;
  // at intensity=1 the spec's colour IS the palette (same brightness);
  // at intensity=2 the spec is the palette AND boosted brightness for
  // HDR push through the ACES tonemap.
  //
  // lum is the original spec's luminance (Rec.709). We then output
  // palette × lum × (1 + overdrive), keeping the spec's spatial
  // shape but with much more vivid colour than the v7 multiply.
  vec3 tintSpecular(vec3 spec, float t){
    float k = clamp(u_iriIntensity, 0.0, 2.0);
    if (k < 0.001) return spec;
    vec3 palette = iridescencePalette(t);
    // Preserve luminance: drop the original hue, multiply palette by
    // the original brightness.
    float lum = dot(spec, vec3(0.2126, 0.7152, 0.0722));
    vec3 tinted = palette * lum * 1.6;  // 1.6 compensates: palette
                                        // averages ~0.5 luma; scaling
                                        // back up keeps the highlight
                                        // bright at intensity=1.
    // Blend from original spec (intensity=0) to fully-tinted (intensity=1),
    // then push above 1.0 for HDR.
    vec3 base = mix(spec, tinted, min(k, 1.0));
    float overdrive = max(k - 1.0, 0.0);
    return base * (1.0 + overdrive * 1.5);
  }
`;

// Apply: tint the spec (preserving its shape + luminance) and write a
// rainbow halo (uses time-drifting iriT input so the ring flows).
//
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      specular = tintSpecular(specular, iriT);
      vec3 haloRainbow = iridescencePalette(loopTime(0.06) + flow * 0.4 + 0.25);
      halo = haloRainbow * haloMask * u_iriIntensity;
    }
`;
