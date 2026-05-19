// =========================================================
// FLOW — animated FBM driving the iridescence palette input
// =========================================================
// Two FBM octaves drift across the surface over time. Combined with
// NdotL, the metaball, time, and texUV.y to produce iriT — the input
// to the iridescence palette function provided by the Iridescence
// effect.
//
// The mixing weights here are what makes the iridescence feel "alive"
// when the Iridescence effect is on:
//   - 0.55 * NdotL    → highlights shift hue with light angle
//   - 0.35 * flow     → slow large-scale colour drift
//   - 0.20 * flow2    → faster small-scale shimmer
//   - 0.04 * time     → constant slow hue rotation
//   - 0.60 * blob     → big hue swing inside the mercury cursor
//   - 0.12 * texUV.y  → vertical gradient (top vs bottom of ornament)
//
// We also set up the baseline `specular` vec3 here — a white,
// unscaled specular from the lighting block. The iridescence effect
// (if enabled) will multiply this by its palette colour; if disabled,
// it stays neutral white and reads as plain silver specular.
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               + u_time * 0.04
               + blob * 0.6
               + texUV.y * 0.12;

    // Baseline (unmixed) specular — pure white at the moment.
    // Iridescence effect multiplies this by its palette; if disabled,
    // it stays white and reads as plain Blinn-Phong specular.
    vec3 specular = vec3(spec * u_specular);
    specular *= (1.0 + blob * 3.0);
`;
