// =========================================================
// FLOW — minimal flow setup so effects can layer cleanly
// =========================================================
// Obsidian doesn't have a mercury-style metaball, but effects like
// Iridescence read `flow` and `iriT` to drive their palette input.
// We compute them here so any effect "just works" on this material.
//
// Without the metaball, blob = 0. The iriT mix matches Mercury's
// philosophy (NdotL drives most of the hue, flow adds drift) but
// without the blob term.
//
// Baseline specular is white and scaled by u_specular + the
// shininess-tightened spec. Effects can tint it after this block.
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));

    // No blob on obsidian — keep it as 0.0 so effects/halo code that
    // references it stays valid without affecting the look.
    float blob = 0.0;

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               + u_time * 0.04
               + texUV.y * 0.12;

    // Baseline specular — white, scaled by lighting uniforms.
    // Effects can multiply this by colour (iridescence) afterward.
    vec3 specular = vec3(spec * u_specular);
`;
