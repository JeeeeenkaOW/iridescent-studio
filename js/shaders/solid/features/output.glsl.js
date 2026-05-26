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
    // bg is sampled unconditionally; what we DO with it depends on
    // transparent mode. In opaque mode we composite the ornament over
    // the user's designed bg (gradient/image/solid). In transparent
    // mode we want to emit the pure ornament color with alpha = mask
    // so a downstream compositor can blend the ornament cleanly
    // against any backdrop — no dark fringe from the studio bg.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    // Opaque path: ornament composites over bg using the AA mask.
    vec3 colOpaque = mix(bg, bg * (1.0 - mask) + fg, inside);
    // Transparent path: the ornament's own color, with no bg
    // admixture. mask still scales the ornament so the silhouette
    // is correct, but there's no bg term to darken AA edges. Halo
    // is intentionally excluded — transparent export = ornament only.
    vec3 colTransparent = ornament;
    vec3 col = mix(colOpaque, colTransparent, step(0.5, u_bgTransparent));

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

    // Smooth high-quality silhouette alpha when transparent. The
    // rasterized albedo is already anti-aliased — mask values smoothly
    // transition 0→1 across ~1 pixel at edges. Using the raw mask as
    // alpha gives a pixel-perfect AA edge matching the source SVG.
    //
    // This is STRAIGHT (non-premultiplied) alpha: at edge pixels the
    // shader's compositing earlier in this block produces the correct
    // edge color via mix(bg, ornament, mask), and we just emit that
    // color paired with alpha = mask so a downstream compositor can
    // blend it properly. Halo is intentionally excluded so the
    // transparent cutout is the ornament alone.
    float coverage = inside * mask;
    float alpha = mix(1.0, coverage, step(0.5, u_bgTransparent));
    gl_FragColor = vec4(col, alpha);
`;
