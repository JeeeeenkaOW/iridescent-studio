// =========================================================
// COMPOSITE — combine base metal + specular
// =========================================================
// Realism additions:
//   - Ambient term uses hemiAmbient(N, sky, ground) instead of a flat
//     constant. Top of the silhouette picks up cool sky tint, bottom
//     picks up warm ground tint.
//   - Diffuse term is tinted by u_lightColor (light's hue bleeds
//     into diffuse the same way it bleeds into spec).
//
// The 0.4 blob iridescence bump is preserved — iridescence() returns
// white when the effect is off, so this is neutral by default.
//
// Material uniforms used:
//   u_baseColor    — surface albedo
//   u_diffuse      — diffuse gain
//   u_lightColor   — light tint into diffuse
//   u_skyColor     — hemisphere ambient sky
//   u_groundColor  — hemisphere ambient ground
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    // Hemisphere ambient instead of flat 0.18.
    vec3 ambient = base * hemiAmbient(N, u_skyColor, u_groundColor);

    // Diffuse tinted by light color.
    vec3 diffuse = ambient + base * u_diffuse * NdotL * u_lightColor;

    // Blob iridescence — neutral white if the effect is off. This is
    // Mercury's signature look and runs independently of the new
    // soap-film overlay below.
    diffuse += iridescence(iriT) * blob * 0.4;

    vec3 ornament = diffuse + specular;

    // Iridescence soap-film overlay (zero when effect is off).
    ornament += iriOverlay;
`;
