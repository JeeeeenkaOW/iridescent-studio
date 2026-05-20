// =========================================================
// FLOW — animated FBM driving iridescence palette + Fresnel spec
// =========================================================
// Two FBM octaves drift across the surface. Combined with NdotL, the
// (optional) metaball, time, and texUV.y to produce iriT — the input
// the Iridescence effect's palette function reads.
//
// Specular: scalar Blinn-Phong × Fresnel-coloured (F0) × light tint ×
// user specular gain × metaball boost (when blob > 0).
//
// Note: this material always declares `blob` (set by metaballBlock to
// 0 when disabled), so the `(1 + blob * 3)` term is safe.
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + vec2(u_time * 0.025, u_time * 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + vec2(-u_time * 0.04, u_time * 0.03));

    float iriT = NdotL * 0.55
               + flow * 0.35
               + flow2 * 0.2
               + blob * 0.6
               + texUV.y * 0.12;

    // Schlick Fresnel against coloured F0 — F0 hue is inherited at
    // facing angles, ramps toward white at grazing.
    vec3 F = fresnelSchlickColored(NdotV, u_f0);

    // Baseline specular.
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
    specular *= (1.0 + blob * 3.0);
`;
