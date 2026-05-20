// =========================================================
// OUTPUT — final compositing
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// The Iridescence effect writes `halo` with a rainbow palette when
// enabled. The Bloom effect (off by default) writes `halo` when
// enabled, taking precedence (its apply runs after iridescence's).
// When neither effect is on, `halo` stays at zero — no glow.
//
// The material's tuned baseline halo color/intensity live in
// `u_haloBaseColor` and `u_haloBaseIntensity` — only Bloom reads
// those; iridescence uses its own palette + a hardcoded 0.32
// coefficient (matching this material's original halo intensity).
//
// Realism addition: ACES tonemap is applied AFTER vignette but BEFORE
// grain. Without tonemapping, highlights blow out to white; with it,
// they roll off cleanly and pushed-up Lighting sliders don't
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
