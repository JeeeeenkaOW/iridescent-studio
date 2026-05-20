// =========================================================
// FLOW — animated FBM driving the iridescence palette + Fresnel spec
// =========================================================
// Two FBM octaves drift across the surface over time. Combined with
// NdotL, the metaball, time, and texUV.y to produce iriT — the input
// to the iridescence palette function (provided by the Iridescence
// effect as a helper).
//
// Realism additions:
//   - Specular is colored by Schlick Fresnel against u_f0 (coloured
//     for metals — mercury's f0 is slightly warm silver).
//   - Specular is then tinted by u_lightColor (the light's hue
//     bleeds into the highlight, which is what real lights do).
//
// The mixing weights into iriT are unchanged from the original:
//   0.55*NdotL + 0.35*flow + 0.20*flow2 + 0.04*time + 0.60*blob + 0.12*texUV.y
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               // u_time drift removed — kept hues anchored to surface
               + blob * 0.6
               + texUV.y * 0.12;

    // Schlick Fresnel against coloured F0 (mercury is a metal —
    // its reflections inherit its tint). At grazing angles
    // (NdotV → 0) the spec ramps toward white; at facing angles
    // it stays in u_f0's hue. This is the single biggest change
    // toward metal-realistic reflection behaviour.
    vec3 F = fresnelSchlickColored(NdotV, u_f0);

    // Baseline specular: Blinn-Phong scalar × Fresnel-coloured ×
    // light tint × user specular gain × metaball boost.
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
    specular *= (1.0 + blob * 3.0);
`;
