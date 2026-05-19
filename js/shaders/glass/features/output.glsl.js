// =========================================================
// HALO + OUTPUT — exposes halo intermediates for effects
// =========================================================
// Halo block declares `halo`, `haloMask`, `haloIntensity` so the
// Iridescence effect (which runs between halo and output) can
// overwrite `halo` with palette colour.
//
// Composite + output: refracted bg blended by transparency, plus
// specular highlight, plus halo.
//
// Tuneables (hardcoded):
//   - halo intensity:    0.25   (subtle — glass isn't a glowy material)
//   - halo mask falloff: 0.7
//   - vignette range:    0.35 → 1.15
//   - grain:             0.018
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    float haloIntensity = 0.25;
    // Default glass halo: cool-blue, monochromatic. Iridescence effect
    // can overwrite this.
    vec3 halo = vec3(0.7, 0.8, 0.9) * haloMask * haloIntensity;
`;

export const compositeBlock = /* glsl */ `
    // The "solid" appearance of glass when transparency is 0 —
    // a very light frosted white. Acts as the opaque limit.
    vec3 solid = vec3(0.92, 0.94, 0.96);

    // What you see through the ornament.
    vec3 through = mix(solid, glassBg, u_transparency);

    // specular vec3 was set up in flowBlock and may have been tinted
    // by the iridescence effect by this point.
    vec3 ornament = through + specular;
`;

export const outputBlock = /* glsl */ `
    // Bg outside the ornament — straight, no refraction.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
