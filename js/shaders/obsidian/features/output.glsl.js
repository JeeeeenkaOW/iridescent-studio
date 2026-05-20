// =========================================================
// OUTPUT — final compositing
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// The Bloom effect writes `halo` when enabled.
// `iriOverlay` is initialized to zero; Iridescence writes it,
// compositeBlock adds it to `ornament`.
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    vec3 halo = vec3(0.0);
    vec3 iriOverlay = vec3(0.0);
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
