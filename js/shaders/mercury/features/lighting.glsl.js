// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// L: light vector from texel to cursor (with a small Z height of 0.16
//    so we get a proper highlight as it sweeps across the surface).
// V: view vector — orthographic camera so always (0,0,1).
// H: half-vector for Blinn-Phong specular.
//
// NdotL → diffuse term.
// NdotH^28 → specular highlight (the 28 controls shininess).
//
// Tuneables (currently hardcoded — first thing we'd promote to uniforms):
//   - light Z height:      0.16
//   - specular exponent:   28.0
//
export const lightingBlock = /* glsl */ `
    vec3 lightV = vec3(mouseTexUV - texUV, 0.16);
    vec3 L = normalize(lightV);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, 28.0);
`;
