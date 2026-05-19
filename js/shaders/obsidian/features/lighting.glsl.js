// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// L: light vector from texel to cursor with Z = u_lightHeight.
// V: orthographic camera view → (0,0,1).
// H: half-vector for Blinn-Phong specular.
//
// NdotL → diffuse term.
// NdotH^shininess → specular highlight (higher = tighter).
//
// Uniforms:
//   u_lightHeight — virtual light Z height. Lower = stretched
//                   highlight; higher = compact, more centred.
//   u_shininess   — specular exponent. (in lighting math, used in
//                   spec calc here.)
//
export const lightingBlock = /* glsl */ `
    vec3 lightV = vec3(mouseTexUV - texUV, u_lightHeight);
    vec3 L = normalize(lightV);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, u_shininess);
`;
