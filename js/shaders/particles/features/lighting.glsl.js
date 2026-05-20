// =========================================================
// PARTICLES LIGHTING — Blinn-Phong against particle normals
// =========================================================
// Standard Blinn-Phong but evaluated AT THE PARTICLE CENTRE (not
// per-fragment). Each particle dot picks up a single lighting value
// determined by the underlying normal at its centre — this gives
// the dots a sense of being lit from the cursor direction, even
// though they're really just flat circles.
//
// Variables set by this block:
//   NdotL — cursor-to-surface alignment at the particle centre
//   NdotV — view alignment (used by Fresnel)
//   spec  — Blinn-Phong scalar specular term
//
// Reads `particleN` and `particleCenter` from particles.glsl.js.
//
export const lightingBlock = /* glsl */ `
    // Aspect-corrected cursor → particle vector.
    vec2 toLight2 = (u_mouse - particleCenter) * vec2(u_imgAspect, 1.0);
    vec3 L = normalize(vec3(toLight2, u_lightHeight));
    vec3 V = vec3(0.0, 0.0, 1.0);  // orthographic view, straight-on
    vec3 H = normalize(L + V);

    float NdotL = max(dot(particleN, L), 0.0);
    float NdotV = max(dot(particleN, V), 0.0);
    float NdotH = max(dot(particleN, H), 0.0);
    float spec  = pow(NdotH, u_shininess);
`;
