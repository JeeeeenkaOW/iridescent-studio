// =========================================================
// COMPOSITE — assemble the obsidian body
// =========================================================
// Plain dark glass. Layered:
//
//   1. DARKENED REFRACTED BG
//      The bg seen "through" the obsidian, heavily attenuated. Multiplied
//      by 0.15 so it reads as a hint of light through dense dark material.
//
//   2. DIFFUSE × BASE COLOR
//      Standard Blinn-Phong diffuse with small ambient. Low intensity
//      (u_diffuse defaults low for obsidian) so the body stays dark.
//
//   3. SPECULAR
//      The clearcoat highlight, broken up by the roughness perturbation
//      to N. Tinted by the iridescence effect if enabled.
//
//   4. FRESNEL RIM
//      White rim where the silhouette curves away from the camera.
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    // Diffuse term: base × NdotL with small ambient. NdotL was computed
    // against the rough-perturbed normal, so the lit area is itself stippled.
    vec3 diffuse = base * (0.12 + u_diffuse * NdotL);

    // Refracted bg, heavily attenuated — light leaking through dense glass.
    vec3 internal = throughBg * 0.15;

    vec3 body = diffuse + internal;

    // Add specular (possibly iridescence-tinted) and fresnel rim.
    vec3 ornament = body + specular + vec3(fresnel);
`;
