// =========================================================
// FLOW — animated FBM driving the iridescent palette
// =========================================================
// Two FBM octaves drift across the surface over time. Combined with
// NdotL, the metaball, time, and texUV.y to produce iriT — the input
// to the iridescence palette function.
//
// The mixing weights here are what makes the iridescence feel "alive":
//   - 0.55 * NdotL   → highlights shift hue with light angle
//   - 0.35 * flow    → slow large-scale color drift
//   - 0.20 * flow2   → faster small-scale shimmer
//   - 0.04 * time    → constant slow hue rotation
//   - 0.60 * blob    → big hue swing inside the mercury cursor
//   - 0.12 * texUV.y → vertical gradient (top vs bottom of ornament)
//
// Tuneables (hardcoded — high-value targets for material presets):
//   - flow scale:     2.4
//   - speed1:         (0.025, 0.018)
//   - speed2:         (-0.04, 0.03)
//   - all six weights above
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
    vec3 iri = iridescence(iriT);
`;
