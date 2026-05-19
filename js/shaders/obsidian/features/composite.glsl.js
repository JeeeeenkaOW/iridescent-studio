// =========================================================
// COMPOSITE — assemble the obsidian body
// =========================================================
// Layered from inside to outside:
//
//   1. DARKENED REFRACTED BG
//      The bg seen "through" the obsidian, heavily attenuated.
//      Multiplied by 0.15 so it reads as a hint of light bleeding
//      through dense dark material, not a clear glass read.
//
//   2. ACCENT GLOW
//      A coloured tint applied with falloff from the centre of the
//      ornament toward the edges. `bloom` is bright at the centre of
//      thick areas and dim near edges — we use (1 - bloom*0.5) so
//      the deepest accent shows where the silhouette is thickest,
//      mimicking the dice's `attenuationDistance` falloff.
//
//   3. DIFFUSE × BASE COLOR
//      Standard Blinn-Phong diffuse, very low intensity (material
//      defaults set u_diffuse small for obsidian).
//
//   4. SPECULAR
//      The clearcoat. Bright, tight, possibly tinted by the
//      iridescence effect.
//
//   5. FRESNEL RIM
//      White rim where the silhouette turns away from the camera.
//
// The combination reads as: dark body → red inner glow → sharp white
// highlight + rim. Matches the dice reference's mood without trying
// to be physically accurate.
//
export const compositeBlock = /* glsl */ `
    // Base: dark body colour.
    vec3 base = u_baseColor;

    // Accent: stronger where bloom (silhouette interior) is high, so
    // the centre of thick shapes glows; edges stay close to base.
    float accentMix = u_accentStrength * (0.4 + 0.6 * bloom);
    vec3 tinted = mix(base, u_accentColor, accentMix);

    // Diffuse term: tinted body × NdotL with small ambient.
    vec3 diffuse = tinted * (0.12 + u_diffuse * NdotL);

    // Refracted bg, heavily attenuated — a hint of light through.
    vec3 internal = throughBg * 0.15;

    // Body of the material.
    vec3 body = diffuse + internal;

    // Add specular and fresnel rim. Fresnel is white; specular may
    // have been tinted by the iridescence effect.
    vec3 ornament = body + specular + vec3(fresnel);
`;
