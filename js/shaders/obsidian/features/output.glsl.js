// =========================================================
// OUTPUT — final compositing
// =========================================================
// Halo is faint and accent-tinted by default — a subtle inner-glow
// leak around silhouettes. The Iridescence effect can overwrite it
// (its applyGlsl reads haloMask + haloIntensity and writes a new
// palette-coloured halo into `halo`).
//
// Tuneables (hardcoded):
//   - halo intensity:      0.20   (lower than mercury — obsidian is darker)
//   - halo mask falloff:   0.7
//   - vignette range:      0.35 → 1.15
//   - grain:               0.018
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    float haloIntensity = 0.20;
    // Default halo: accent-tinted. Effects can overwrite this.
    vec3 halo = u_accentColor * haloMask * haloIntensity;
`;

export const outputBlock = /* glsl */ `
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
