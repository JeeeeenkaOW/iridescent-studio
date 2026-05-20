// =========================================================
// IRIDESCENCE EFFECT — GLSL
// =========================================================
// Soap-film rainbow that rides OVER the lit material without
// retinting the body. Material colors stay; rainbow stripes bloom
// around the cursor (driven by NdotL² + spec hot spot) and drift
// over time via flow noise — matching the cursor-following
// iridescent feel of the original Mercury implementation, now
// generic across materials.
//
// Two pieces in the host shader:
//
//   helpers — `iridescence(t)` (white when off, rainbow when on —
//             used by Mercury composite and by Bloom for tinting)
//           — `iridescencePalette(t)` (always returns the raw
//             rainbow regardless of intensity — used here for the
//             soap-film tint)
//
//   apply   — writes `iriTint` (vec3) — each material's composite
//             multiplies its `ornament` by `iriTint` at the end.
//             When the effect is off `iriTint` stays at vec3(1.0)
//             (initialized in haloBlock) so the multiplication is
//             a no-op.
//
// Why multiplicative and not additive? On bright base materials
// (ceramic's near-white body) an additive rainbow gets clipped to
// white by the ACES tonemap — you see no hue, just brightness.
// Multiplicative preserves channel ratios: a magenta tint on a
// white surface stays magenta. The tint is mixed in by cursor
// weight, so areas away from the cursor stay at their original
// (untinted) color — the model doesn't get a global hue drift.
//
// Host material contract:
//   - declare `vec3 iriTint = vec3(1.0);` in haloBlock
//   - in composite, multiply `ornament *= iriTint;` at the end
//   - reads available in apply scope: `flow`, `texUV`, `mask`,
//     `NdotL`, `spec`, `u_specular`, `u_time`, `u_iriIntensity`,
//     `u_iriPhase`
//
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

// Multiplicative cursor tint.
//
// 1) Cursor weight — concentrates the rainbow where the cursor is,
//    so the rainbow stays a localized "highlight on a soap bubble"
//    rather than a model-wide hue. NdotL² is sharper than NdotL
//    (the iridescence reads as a defined area, not a wash). spec
//    × u_specular adds a bright spike right at the Blinn-Phong hot
//    spot — Mercury's high specular + metaball boost makes this
//    a vivid colored highlight there; dielectrics get a softer
//    version, falling back to NdotL².
//
// 2) iriT_overlay — our own version of iriT with heavier spatial
//    variation (texUV + flow) and a slow time drift. This makes
//    the rainbow appear as STRIPES across the cursor area rather
//    than a single hue, which is what reads as "soap film" instead
//    of "tinted highlight."
//
// 3) Rainbow lifted to mean 1.0 (so multiplicative tint doesn't
//    darken the surface on average — channels swing above and below
//    1.0 equally as the cosine cycles).
//
// 4) iriTint — mix from white (no tint) toward the rainbow tint
//    by `weight * u_iriIntensity`. Composite does `ornament *= iriTint`
//    so the multiplication is a no-op away from the cursor and a
//    full rainbow tint at the highlight.
export const apply = /* glsl */ `
    if (u_iriIntensity > 0.001) {
      float specPeak  = spec * u_specular;
      float cursor    = NdotL * NdotL + specPeak * 3.5;
      cursor          = clamp(cursor, 0.0, 1.0);

      float iriT_over = flow * 1.1 + texUV.x * 0.55 + texUV.y * 0.45 + u_time * 0.05;
      vec3 rainbow    = iridescencePalette(iriT_over);
      vec3 tint       = rainbow + vec3(0.5);    // lift mean from 0.5 → 1.0

      float weight    = cursor * u_iriIntensity * mask;
      iriTint         = mix(vec3(1.0), tint, weight);
    }
`;
