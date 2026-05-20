// =========================================================
// OUTPUT — final compositing
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// Only Bloom writes `halo` (it's the only effect that draws a glow
// ring). When Bloom is off, halo stays at zero.
//
// Bloom multiplies its halo color by `iridescence(t)` which returns
// vec3(1.0) when iridescence is off (neutral halo) and the palette
// when on (rainbow halo). So enabling iridescence alone produces
// only a tinted highlight; enabling Bloom + iridescence gives the
// rainbow halo from v8.
//
// Realism: ACES tonemap is applied after vignette but before grain.
//
// Tuneables (material-level defaults):
//   - halo color/intensity: u_haloBaseColor / u_haloBaseIntensity
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
