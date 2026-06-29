// =========================================================
// REFRACTION + FROST — bg sample distorted by surface normal
// =========================================================
// Reads the background through the ornament with a normal-driven UV
// offset, optionally frosted. Folds in the behaviour of the retired
// Glass shader so the unified Solid material can reproduce every glass
// configuration:
//
//   u_refraction    — UV offset magnitude (0..0.20). Independent knob:
//                     edges of the silhouette lens the bg; flat interior
//                     leaves it near-undistorted.
//   u_refractionMix — how much throughBg leaks into the body (0 opaque,
//                     1 full glass-like transmission). Composite reads it.
//   u_frost         — two contributions, both gated by u_frost:
//                       a) fine-scale noise perturbation of N so the
//                          specular highlight scatters (frost's soft
//                          glow). Written back to N so the downstream
//                          flow/fresnel blocks see the frosted surface.
//                       b) 8-tap ring blur on the refracted bg sample —
//                          visible when the bg isn't solid black.
//
// `throughBg` is the final refracted (+ frosted) bg sample; the
// composite step blends it toward the body via u_refractionMix.
//
export const refractionBlock = /* glsl */ `
    // ---- Frost: perturb N before refraction so the refracted bg and
    // the scattered specular read as the same surface.
    if (u_frost > 0.001 && mask > 0.01) {
      vec2 fr1 = texUV * 140.0;
      vec2 fr2 = texUV * 360.0 + vec2(17.4, 9.1);
      float fnx = (noise(fr1)                  - 0.5) * 0.60
                + (noise(fr2)                  - 0.5) * 0.40;
      float fny = (noise(fr1 + vec2(3.7, 1.9)) - 0.5) * 0.60
                + (noise(fr2 + vec2(3.7, 1.9)) - 0.5) * 0.40;
      N = normalize(N + vec3(vec2(fnx, fny) * u_frost * 0.55, 0.0));
    }

    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    vec2 refractOffset = N.xy * u_refraction * aspectFix;
    vec2 bgSampleUV = clamp(v_uv + refractOffset, vec2(0.0), vec2(1.0));

    // ---- Frost: 8-tap ring blur on the refracted bg sample. Radius
    // scales with u_frost (~2% of viewport width at 1.0).
    float frostR = u_frost * 0.020;
    vec3 throughBg;
    if (u_frost <= 0.001) {
      throughBg = texture2D(u_bgTex, bgSampleUV).rgb;
    } else {
      vec2 r = vec2(frostR) * aspectFix;
      vec3 acc = texture2D(u_bgTex, bgSampleUV).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2( 1.0,  0.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2(-1.0,  0.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2( 0.0,  1.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2( 0.0, -1.0), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2( 0.707,  0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2(-0.707,  0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2( 0.707, -0.707), 0.0, 1.0)).rgb;
      acc += texture2D(u_bgTex, clamp(bgSampleUV + r * vec2(-0.707, -0.707), 0.0, 1.0)).rgb;
      throughBg = acc / 9.0;
    }
`;
