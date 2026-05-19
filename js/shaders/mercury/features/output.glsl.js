// =========================================================
// OUTPUT — final compositing
// =========================================================
// Baseline halo is a soft white ring around silhouette edges, driven
// by bloom. The Iridescence effect (if enabled) overwrites the `halo`
// vec3 with palette-tinted halo via its applyGlsl block, which runs
// BEFORE this block executes its halo-into-fg merge.
//
// Order in main() is:
//   1. sample / metaball / lighting / flow / composite
//      → produces specular (vec3), iri-related intermediates, halo defaults
//   2. effects apply (EFFECTS_APPLY)
//      → tints specular, overwrites halo
//   3. output (this block)
//      → composites everything onto bg
//
// Tuneables (hardcoded — many material preset targets):
//   - halo intensity:      0.32
//   - halo mask falloff:   0.7
//   - vignette range:      0.35 → 1.15
//   - grain:               0.018
//
// Note: `halo`, `haloMask`, and `haloIntensity` are declared in the
// HALO block above this one so the iridescence effect (which runs
// between halo and output) can overwrite `halo` cleanly.
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    float haloIntensity = 0.32;
    // Default halo: warm-neutral, picks up scene lighting. Effects can
    // overwrite this — see iridescence's applyGlsl.
    vec3 halo = vec3(1.0) * haloMask * haloIntensity;
`;

export const outputBlock = /* glsl */ `
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    // Ornament + halo only contribute inside the fitted image rect.
    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
