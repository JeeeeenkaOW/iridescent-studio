// =========================================================
// FLOW — animated FBM + STATIC iridescence field
// =========================================================
// Same structure as Solid. flow is time-drifting (Bloom uses it);
// iriT is time-independent (Iridescence reads it for the specular
// tint, so the hue stays anchored to surface position rather than
// cycling over time).
//
export const flowBlock = /* glsl */ `
    vec2 flowUV = texUV * 2.4 + loopTime2D(0.025, 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + loopTime2D(-0.04, 0.03));
    float blob = 0.0;

    float staticNoise  = fbm(texUV * 2.4);
    float staticNoise2 = fbm(texUV * 4.8 + vec2(11.3, 17.7));

    float iriT = NdotL * 0.55
               + staticNoise  * 0.35
               + staticNoise2 * 0.20
               + texUV.y * 0.12;

    vec3 F = fresnelSchlickColored(NdotV, u_f0);
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
`;
