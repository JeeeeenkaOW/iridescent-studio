// =========================================================
// PARTICLES OUTPUT — halo, composite, final
// =========================================================
// Halo: scaled by particleMask so the halo glows around dot edges
// rather than around the whole silhouette. Bloom is a soft outer
// glow scaled by particleBloom.
//
// Composite: base color tinted by the underlying albedo at the
// particle centre, modulated by lighting. Plus specular highlight.
// Plus halo.
//
// Final mix uses particleMask to gate the foreground into the bg.
//
export const haloBlock = /* glsl */ `
    // Halo intensity peaks at the dot edges (where particleMask
    // softly falls off). 0.7 falloff matches solid's behaviour.
    float haloMask = bloom * (1.0 - particleMask * 0.7);
    vec3 halo = vec3(0.0);
`;

export const compositeBlock = /* glsl */ `
    // Base tint × albedo at the particle's centre. u_baseColor
    // lets the user globally tint the particles.
    vec3 base = u_baseColor * particleAlbedo;

    // Per-particle iridescent body tint. Each dot's iriT lands on the
    // shared palette; we mix that hue INTO base so different dots
    // become different colors (rather than just having different
    // specular hues, which is what the iridescence effect does alone).
    //
    // Gated by BOTH u_particleHueShift (this material's slider) AND
    // u_iriIntensity (the iridescence effect's on/off). Turning the
    // effect off cleanly restores the original look regardless of the
    // hueShift slider position. Uses iridescencePalette() from the
    // iridescence effect's helpers (soft coupling — see fragment header).
    float hueAmt = u_particleHueShift * clamp(u_iriIntensity, 0.0, 1.0);
    if (hueAmt > 0.001) {
      vec3 dotHue = iridescencePalette(iriT);
      // Preserve albedo luminance so light/dark regions of the SVG
      // still read correctly through the tint.
      float lum = max(dot(particleAlbedo, vec3(0.2126, 0.7152, 0.0722)), 0.05);
      base = mix(base, dotHue * lum * 1.4, hueAmt);
    }

    // Ambient — hemisphere term scaled by u_ambientStrength.
    vec3 ambient = base * hemiAmbient(particleN, u_skyColor, u_groundColor) * u_ambientStrength;

    // Diffuse lighting.
    vec3 diffuse = ambient + base * u_diffuse * NdotL * u_lightColor;

    // Composite particle = diffuse body + specular highlight.
    vec3 ornament = diffuse + specular;
`;

export const outputBlock = /* glsl */ `
    // bg sampled unconditionally. Opaque mode: composite particles
    // over user's designed bg. Transparent mode: emit the ornament
    // color directly so AA edges of each dot fade ornament→nothing,
    // not ornament→studio-bg.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    // particleMask gates the dots into the bg. halo adds glow
    // around dot edges (independent of particleMask).
    vec3 fg = ornament * particleMask + halo;
    vec3 colOpaque = mix(bg, bg * (1.0 - particleMask) + fg, inside);
    // Transparent path: ornament alone, no bg darkening AA at dot edges.
    vec3 colTransparent = ornament;
    vec3 col = mix(colOpaque, colTransparent, step(0.5, u_bgTransparent));

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;

    col = acesTonemap(col);

    // Grain seed: loop-safe in loop mode. Periodic + continuous via
    // sin/cos of integer multiples of the loop phase. See solid/output
    // for the full rationale.
    float loopAngle = u_time / max(u_loopDuration, 0.001) * 6.28318;
    float loopSeed = sin(loopAngle) * 37.0 + cos(loopAngle * 2.0) * 51.0;
    float grainSeed = mix(u_time, loopSeed, step(0.5, u_loopMode));
    col += (hash(v_uv * u_resolution + grainSeed) - 0.5) * 0.012;

    // Smooth high-quality silhouette alpha. For particles the
    // silhouette IS the dots (particleMask), which has soft Gaussian-
    // like edges already. Using the raw mask product as alpha gives
    // crisp dots with proper AA.
    float coverage = inside * particleMask;
    float alpha = mix(1.0, coverage, step(0.5, u_bgTransparent));
    gl_FragColor = vec4(col, alpha);
`;
