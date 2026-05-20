// =========================================================
// OUTPUT — final compositing
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// The Bloom effect writes `halo` when enabled. The material exposes
// its default halo color and intensity as uniforms (u_haloBaseColor,
// u_haloBaseIntensity) so the Bloom effect can seed its color picker
// from the material's preset.
//
// Also initializes `iriTint` to zero — the Iridescence effect
// writes it; the compositeBlock multiplies `ornament` by it at the end.
//
// Realism addition: ACES tonemap is applied AFTER vignette but BEFORE
// grain. Without tonemapping, highlights blow out to white; with it,
// they roll off cleanly and pushed-up Lighting effect sliders don't
// destroy the image.
//
// Tuneables (material-level defaults):
//   - halo color/intensity: now in u_haloBaseColor / u_haloBaseIntensity
//   - halo mask falloff:   0.7
//   - vignette range:      0.35 → 1.15
//   - grain:               0.018
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    vec3 halo = vec3(0.0);
    vec3 iriTint = vec3(1.0);
`;

export const outputBlock = /* glsl */ `
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;

    col = acesTonemap(col);

    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
