// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// L: light vector from texel to cursor with Z = u_lightHeight.
// V: orthographic camera view → (0,0,1).
// H: half-vector for Blinn-Phong specular.
//
// Outputs used by later blocks:
//   NdotL — diffuse term
//   spec  — Blinn-Phong specular term (scalar)
//   NdotV — for Schlick Fresnel (computed here so every later block
//           that needs Fresnel reads the same value)
//
// Uniforms read:
//   u_lightHeight, u_shininess.
//   (u_lightColor and u_specular feed into the next block, flow-fbm.)
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
