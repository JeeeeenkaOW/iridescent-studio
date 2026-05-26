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
    // bg is sampled unconditionally — the ornament composites over it
    // exactly as the user designed. Transparency is a final-alpha
    // concern: inside the silhouette the user keeps their designed
    // composite (including any bg-leak the material does); outside,
    // the alpha drops to 0 so the bg is fully removed from the
    // exported file. The silhouette edge is a hard pixel-AA cut, not
    // a soft fade — no halo bleed.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;

    col = acesTonemap(col);

    // Grain seed: in normal mode, u_time. In loop mode we need
    // grainSeed(t=0) == grainSeed(t=loopDuration) so the loop
    // closes, AND the seed must be continuous (no mid-loop pops).
    // sin/cos of integer multiples of the loop phase give both:
    // periodic by construction, smooth everywhere. Hash() turns
    // smooth input into per-pixel noise, so the grain still looks
    // random frame-to-frame.
    float loopAngle = u_time / max(u_loopDuration, 0.001) * 6.28318;
    float loopSeed = sin(loopAngle) * 37.0 + cos(loopAngle * 2.0) * 51.0;
    float grainSeed = mix(u_time, loopSeed, step(0.5, u_loopMode));
    col += (hash(v_uv * u_resolution + grainSeed) - 0.5) * 0.018;

    // Sleek-edge alpha when transparent. Hard binary cutoff at the
    // SVG's anti-aliased edge — every pixel is either fully opaque
    // (inside the ornament) or fully transparent (outside). No partial
    // alpha at the silhouette edge means no risk of fringing or AA
    // artifacts in viewers that handle alpha imperfectly.
    // Halo is intentionally NOT included — transparent export = the
    // ornament cut out cleanly, no outer glow bleeding into the alpha.
    float coverage = step(0.5, inside * mask);
    float alpha = mix(1.0, coverage, step(0.5, u_bgTransparent));

    // Zero RGB outside the silhouette in transparent mode. Belt-and-
    // suspenders: even if a viewer ignores the alpha channel, RGB
    // is already zero so the cutout still reads correctly. Inside
    // the silhouette coverage=1, so col is unaffected.
    col *= mix(1.0, coverage, step(0.5, u_bgTransparent));

    gl_FragColor = vec4(col, alpha);
`;
