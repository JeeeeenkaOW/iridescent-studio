// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// Same setup as Mercury but with a tighter, weaker highlight.
// We don't expose material parameters on glass — the look is
// dominated by refraction + frost, not surface lighting.
//
export const lightingBlock = /* glsl */ `
    vec3 lightV = vec3(mouseTexUV - texUV, 0.16);
    vec3 L = normalize(lightV);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, 48.0);
`;
