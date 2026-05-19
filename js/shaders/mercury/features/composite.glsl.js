// =========================================================
// COMPOSITE — combine base metal + specular
// =========================================================
// Diffuse: base color × NdotL (plus a small ambient).
// Specular: the `specular` vec3 computed by flow block + tinted by
//   the iridescence effect (if enabled).
//
// In the original Mercury, the metaball blob added some iridescent
// diffuse for a "carries color inside the blob" feel. We keep that
// blob bump on the diffuse but tint it with `iriCol` ONLY if the
// iridescence effect produced a non-trivial colour. To do that
// cleanly we reference `iridescence(iriT)` directly — when the
// effect is off, the iridescence helper returns white (u_iriIntensity
// is 0), so the result is neutral and the blob just brightens with
// base color tint. When on, the blob picks up palette colour.
//
// Material uniforms used:
//   u_baseColor — surface albedo
//   u_diffuse   — diffuse gain
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;
    vec3 diffuse = base * (0.18 + u_diffuse * NdotL);

    // Blob iridescence read — neutral white when iridescence is off
    // (because the helper returns white at intensity=0).
    diffuse += iridescence(iriT) * blob * 0.4;

    vec3 ornament = diffuse + specular;
`;
