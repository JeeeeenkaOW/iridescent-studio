// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// Same setup as Mercury / Glass / Obsidian.
//
export const lightingBlock = /* glsl */ `
    vec3 lightV = vec3(mouseTexUV - texUV, u_lightHeight);
    vec3 L = normalize(lightV);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    float spec = pow(NdotH, u_shininess);
`;
