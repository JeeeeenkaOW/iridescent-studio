// =========================================================
// OUTPUT — final compositing
// =========================================================
// Single rendering style (the old "dark void" look). The background
// shows through wherever the ornament doesn't cover the pixel, sampled
// from u_bgTex (driven by Solid / Gradient / Image background mode in
// background.js).
//
// Important: mask/bloom can have garbage outside the fitted image rect
// because sample.glsl.js clamps the UV. We use `inside` to gate the
// ornament+halo contribution so they only render within that rect.
//
//   - Background fills the whole viewport
//   - Ornament composited over the bg (gated by `inside`)
//   - Iridescent halo around the ornament edges (bloom-driven, gated)
//   - Soft radial vignette over everything
//   - 1.8% grain
//
// Tuneables (hardcoded — many material preset targets):
//   - halo intensity:      0.32
//   - halo mask falloff:   0.7
//   - halo tint offset:    0.25
//   - vignette range:      0.35 → 1.15
//   - grain:               0.018
//
export const outputBlock = /* glsl */ `
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    float haloMask = bloom * (1.0 - mask * 0.7);
    vec3 halo = iridescence(u_time * 0.06 + flow * 0.4 + 0.25) * haloMask * 0.32;

    // Ornament + halo only contribute inside the fitted image rect.
    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
