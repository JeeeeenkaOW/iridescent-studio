// =========================================================
// FLOW — minimal flow setup so effects can layer cleanly
// =========================================================
// Glass has no metaball. Effects (Iridescence) read `flow` and `iriT`;
// we set them up so the effect "just works" if enabled on Glass.
//
// Specular is computed here with Schlick Fresnel against u_f0
// (dielectric, low F0) and tinted by u_lightColor. The result is a
// faint highlight on flat surface, ramping bright at silhouette edges
// — exactly the look real glass has.
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));
    float blob = 0.0;

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               // u_time drift removed — kept hues anchored to surface
               + texUV.y * 0.12;

    vec3 F = fresnelSchlickColored(NdotV, u_f0);
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
`;
