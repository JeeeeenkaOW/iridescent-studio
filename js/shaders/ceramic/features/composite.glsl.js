// =========================================================
// COMPOSITE — assemble the ceramic body
// =========================================================
// Layered:
//   1. AMBIENT (hemisphere) — sky/ground tinted into base
//   2. DIFFUSE — base × NdotL × light color
//   3. SUBSURFACE — sssTint added on top (inner warm glow)
//   4. SPECULAR — soft Fresnel-coloured highlight
//
// Composition order matters: ambient is darkest, diffuse lifts the lit
// areas, subsurface lifts the interior, specular peaks at the highlight.
// Together they read as "lit white porcelain catching warm light."
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    // Hemisphere ambient — directional tint instead of flat constant.
    vec3 ambient = base * hemiAmbient(N, u_skyColor, u_groundColor) * 0.8;

    // Diffuse: base × NdotL × light color.
    vec3 diffuse = ambient + base * u_diffuse * NdotL * u_lightColor;

    // Subsurface glow — added directly to the body, reads as inner
    // warmth where the silhouette is thickest.
    diffuse += sssTint;

    // Specular (Fresnel-coloured, possibly iridescence-tinted by the effect's apply).
    vec3 ornament = diffuse + specular;
`;
