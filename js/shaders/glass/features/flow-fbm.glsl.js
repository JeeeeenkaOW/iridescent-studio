// =========================================================
// FLOW — minimal flow setup so effects can layer cleanly
// =========================================================
// Glass doesn't have a metaball, but Iridescence and similar effects
// read `flow` and `iriT` from the host material. We set them up so
// the effect "just works" if the user enables it on Glass.
//
// Baseline `specular` is white and scaled by u_specular. Effects can
// tint it after this block.
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));

    // No blob on Glass — keep as 0.0 so effects/halo references work
    // without affecting the look.
    float blob = 0.0;

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               + u_time * 0.04
               + texUV.y * 0.12;

    // Baseline specular — white, scaled by u_specular. Effects may
    // tint this; otherwise it stays neutral.
    vec3 specular = vec3(spec * u_specular);
`;
