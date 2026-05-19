// =========================================================
// REFRACTION + FROST — distort and blur the background
// =========================================================
// Two effects stacked:
//
//   1. REFRACTION
//      The surface normal's XY component is added to the screen UV
//      used to sample u_bgTex. This produces the "lens" look at
//      ornament silhouette edges (normals point outward there) while
//      leaving the flat interior near-undistorted.
//      `u_refraction` (0..0.2 typical) controls offset magnitude.
//
//   2. FROST
//      A box-ish blur applied to the refracted sample. 8 taps in a
//      ring around the base UV, averaged with the center tap.
//      `u_frost` (0..1) is mapped to a screen-space radius. At 0 we
//      do a single tap (no extra cost beyond the offset add); at 1
//      the radius is ~2% of screen width — soft frosted-glass.
//
// `glassBg` is the final refracted+frosted background sample, ready
// to be blended into the ornament composite by transparency amount.
//
export const refractionBlock = /* glsl */ `
    // Aspect-correct refraction offset. We multiply X by an inverse
    // aspect factor so the refraction looks isotropic regardless of
    // viewport shape.
    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    vec2 refractOffset = N.xy * u_refraction * aspectFix;
    vec2 baseBgUV = clamp(v_uv + refractOffset, vec2(0.0), vec2(1.0));

    // Frost: 8-tap ring blur. Radius scales with u_frost.
    float frostR = u_frost * 0.020;
    vec3 glassBg;
    if (u_frost <= 0.001) {
      glassBg = texture2D(u_bgTex, baseBgUV).rgb;
    } else {
      vec2 r = vec2(frostR) * aspectFix;
      vec3 acc = texture2D(u_bgTex, baseBgUV).rgb;
      // 8 evenly-spaced taps around the ring + a few inner taps
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
