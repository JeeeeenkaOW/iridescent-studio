// =========================================================
// LIGHTING — Blinn-Phong with cursor as point light
// =========================================================
// Same Blinn-Phong setup as Mercury and Obsidian. Reads the four
// lighting uniforms (u_diffuse, u_specular, u_shininess, u_lightHeight)
// so the Lighting effect can override them.
//
// Glass's preset values (set in defaults.js → uniforms.js) give it a
// tight, weak highlight that doesn't compete with the refraction read.
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
