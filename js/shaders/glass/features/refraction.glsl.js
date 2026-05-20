// =========================================================
// REFRACTION + FROST — distort bg, scatter highlight
// =========================================================
// Two effects:
//
//   1. REFRACTION
//      Surface normal's XY component added to the screen UV used to
//      sample u_bgTex. Edges of the silhouette refract the bg; flat
//      interior leaves it near-undistorted. `u_refraction` (0..0.20
//      typical) scales the offset.
//
//   2. FROST
//      Two contributions, both gated by u_frost:
//
//      a) Normal perturbation. We add fine-scale noise to N so the
//         specular highlight scatters across the surface — frost's
//         signature "soft glow" instead of a hot specular point. This
//         is the change that makes frost visible on solid backgrounds
//         (where the bg-blur alone was invisible).
//
//      b) Background blur. 8-tap ring blur around the refracted UV.
//         Visible when bg is not solid black (image / gradient).
//         Radius scales with u_frost — at 1.0 the blur is ~2% of
//         viewport width.
//
// `glassBg` is the final refracted+frosted bg sample, ready for the
// composite step to blend toward solid via u_transparency.
//
// The N perturbation is written back to N here so downstream blocks
// (lighting → flow-fbm → specular) all see the frosted surface.
//
export const refractionBlock = /* glsl */ `
    // ---- Frost: perturb N before refraction so the refracted bg also
    // wobbles in the same direction the specular scatters. Otherwise
    // the two cues read as disconnected.
    if (u_frost > 0.001 && mask > 0.01) {
      vec2 fr1 = texUV * 140.0;
      vec2 fr2 = texUV * 360.0 + vec2(17.4, 9.1);
      float fnx = (noise(fr1)                  - 0.5) * 0.60
                + (noise(fr2)                  - 0.5) * 0.40;
      float fny = (noise(fr1 + vec2(3.7, 1.9)) - 0.5) * 0.60
                + (noise(fr2 + vec2(3.7, 1.9)) - 0.5) * 0.40;
      N = normalize(N + vec3(vec2(fnx, fny) * u_frost * 0.55, 0.0));
    }

    // Aspect-correct refraction offset.
    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    vec2 refractOffset = N.xy * u_refraction * aspectFix;
    vec2 baseBgUV = clamp(v_uv + refractOffset, vec2(0.0), vec2(1.0));

    // ---- Frost: 8-tap ring blur on the refracted bg sample. Soft
    // background even when frost-perturbed N already broke up the
    // specular. Radius scales with u_frost.
    float frostR = u_frost * 0.020;
    vec3 glassBg;
    if (u_frost <= 0.001) {
      glassBg = texture2D(u_bgTex, baseBgUV).rgb;
    } else {
      vec2 r = vec2(frostR) * aspectFix;
      vec3 acc = texture2D(u_bgTex, baseBgUV).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2( 1.0,  0.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2(-1.0,  0.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2( 0.0,  1.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2( 0.0, -1.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2( 0.707,  0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2(-0.707,  0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2( 0.707, -0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(baseBgUV + r * vec2(-0.707, -0.707), 0.0, 1.0)).rgb;
      glassBg = acc / 9.0;
    }
`;
