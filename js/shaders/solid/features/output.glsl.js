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
<<<<<<< HEAD
    // concern: inside the silhouette the user keeps their designed
    // composite (including any bg-leak the material does); outside,
    // the alpha drops to 0 so the bg is fully removed from the
    // exported file. The silhouette edge is a hard pixel-AA cut, not
    // a soft fade — no halo bleed.
=======
    // concern only: we keep col as-is (so glass refraction, soft
    // edges, halo glow all show the bg color the user intended), and
    // emit an alpha derived from coverage so the area outside the
    // ornament drops out in the exported file.
    //
    // Result: "the design, with the background cut out" — exactly
    // what the user expects from a transparent export.
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;

    col = acesTonemap(col);

<<<<<<< HEAD
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

    // Sleek-edge alpha when transparent. We want a sharp silhouette
    // (no soft halo bleed), but still pixel-AA'd so edges aren't
    // staircased. smoothstep over a tight band gives that.
    // Halo is intentionally NOT included — transparent export = the
    // ornament cut out cleanly, no outer glow bleeding into the alpha.
    float coverage = smoothstep(0.45, 0.55, inside * mask);
=======
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;

    // Coverage gates alpha when transparent. inside*mask covers the
    // body (with soft mask edges); haloMask covers the outer glow.
    // Clamp because halo can exceed 1 locally.
    float coverage = clamp(inside * mask + haloMask, 0.0, 1.0);
>>>>>>> 97d724636971e0d096fbf81c936c724d0118f57f
    float alpha = mix(1.0, coverage, step(0.5, u_bgTransparent));
    gl_FragColor = vec4(col, alpha);
`;
