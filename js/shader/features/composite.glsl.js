// =========================================================
// COMPOSITE — combine base metal + iridescent specular
// =========================================================
// This is where the "silver" feel comes from. A warm-grey base color is
// lit by NdotL for the matte diffuse term, then the iridescent palette
// is applied ONLY to the specular highlight — so the rainbow only shows
// up where light is reflecting.
//
// Inside the metaball, diffuse also picks up some iridescence (the
// 0.4 * blob term) so the mercury blob carries color even on flat areas.
//
// Tint is applied multiplicatively at the end. u_tintStrength=0 means
// pure preset (byte-identical to pre-tint behavior); 1.0 means the
// ornament is fully multiplied by u_tintColor.
//
// Tuneables (hardcoded — material preset targets):
//   - base color:          vec3(0.78, 0.74, 0.70)  ← warm silver
//   - diffuse ambient:     0.18
//   - diffuse gain:        0.45
//   - specular intensity:  1.6
//   - blob specular boost: 1.0 + blob*3.0
//   - blob iri diffuse:    0.4
//
export const compositeBlock = /* glsl */ `
    vec3 base = vec3(0.78, 0.74, 0.70);

    vec3 diffuse = base * (0.18 + 0.45 * NdotL);
    vec3 specular = iri * spec * 1.6;
    specular *= (1.0 + blob * 3.0);
    diffuse += iri * blob * 0.4;

    vec3 ornament = diffuse + specular;

    // Multiplicative tint. White + strength 0 leaves ornament untouched.
    vec3 tinted = ornament * u_tintColor;
    ornament = mix(ornament, tinted, u_tintStrength);
`;
