// =========================================================
// COMPOSITE — combine base metal + iridescent specular
// =========================================================
// This is where the "silver" feel comes from. The base color is lit
// by NdotL for the matte diffuse term, then the iridescent palette
// is applied ONLY to the specular highlight — so the rainbow only
// shows up where light is reflecting.
//
// Inside the metaball, diffuse also picks up some iridescence (the
// 0.4 * blob term) so the mercury blob carries color even on flat areas.
//
// Material controls:
//   u_baseColor  — surface base albedo
//   u_diffuse    — diffuse gain (matte/lit balance)
//   u_specular   — specular intensity (how reflective)
//   u_shininess  — specular exponent (in lighting.glsl.js)
//
// Tuneables (hardcoded — material preset targets):
//   - diffuse ambient:     0.18
//   - blob specular boost: 1.0 + blob*3.0
//   - blob iri diffuse:    0.4
//
export const compositeBlock = /* glsl */ `
    vec3 base = u_baseColor;

    vec3 diffuse = base * (0.18 + u_diffuse * NdotL);
    vec3 specular = iri * spec * u_specular;
    specular *= (1.0 + blob * 3.0);
    diffuse += iri * blob * 0.4;

    vec3 ornament = diffuse + specular;
`;
