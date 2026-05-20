// =========================================================
// OUTPUT — final compositing
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// The Bloom effect writes `halo` when enabled. `iriTint` is
// initialized to zero; the Iridescence effect writes it and the
// compositeBlock multiplies `ornament` by it.
//
// Ceramic baseline halo (when Bloom is on): faint and warm-neutral —
// see u_haloBaseColor / u_haloBaseIntensity in createUniforms.
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
