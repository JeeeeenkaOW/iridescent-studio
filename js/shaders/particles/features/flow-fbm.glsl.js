// =========================================================
// PARTICLES FLOW — specular + iridescence inputs
// =========================================================
// Mirrors the solid material's flow block but evaluated AT each
// particle's centre. iriT (static) drives the Iridescence effect's
// per-particle hue. flow (time-drifting) is used by Bloom's halo.
//
// Provides the variables Effects expect to read:
//   specular, iriT, flow, blob (always 0 — no metaball on particles),
//   mask, bloom, haloMask
//
export const flowBlock = /* glsl */ `
    // Time-drifting flow at the particle's centre (for Bloom halo).
    vec2 flowUV = particleCenter * 2.4 + loopTime2D(0.025, 0.018);
    float flow  = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + loopTime2D(-0.04, 0.03));

    // Static field for Iridescence — anchored to particle position.
    float staticNoise  = fbm(particleCenter * 2.4);
    float staticNoise2 = fbm(particleCenter * 4.8 + vec2(11.3, 17.7));

    // No metaball on particles material.
    float blob = 0.0;

    float iriT = NdotL * 0.55
               + staticNoise  * 0.35
               + staticNoise2 * 0.20
               + particleCenter.y * 0.12;

    // Fresnel against F0 (white default for particles → no F0 tint).
    vec3 F = fresnelSchlickColored(NdotV, vec3(0.92));

    // Baseline specular.
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;

    // Rename for downstream effects.
    float mask = particleMask;
    float bloom = particleBloom;
`;
