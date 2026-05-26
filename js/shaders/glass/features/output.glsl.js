// =========================================================
// HALO + COMPOSITE + OUTPUT
// =========================================================
// haloBlock computes `haloMask` and initializes `halo` to zero.
// The Iridescence effect writes `halo` with a rainbow palette when
// enabled. The Bloom effect writes `halo` when enabled (takes
// precedence — its apply runs after iridescence's). When neither
// effect is on, `halo` stays at zero — no glow.
//
// Composite — realism additions:
//   - Hemisphere ambient adds direction to the otherwise flat
//     transparency read.
//   - Grazing-angle reflectance: Fresnel scalar (F.x as proxy for
//     reflection brightness) mixes `through` toward a reflective
//     bright value at silhouette edges. This is what makes real
//     glass look like glass instead of a transparent hole.
//   - Frost: at high u_frost, pulls `through` toward the bright
//     `solid` term (frost = light scattering = brighter body). This
//     is the part the user wanted — frost was inert before because
//     the bg-blur was the only contribution and that's invisible on
//     a black bg.
//
// Output adds ACES tonemap.
//
export const haloBlock = /* glsl */ `
    float haloMask = bloom * (1.0 - mask * 0.7);
    vec3 halo = vec3(0.0);
`;

export const compositeBlock = /* glsl */ `
    // The "solid" appearance of glass when transparency is 0 —
    // a very light frosted white tinted by hemisphere ambient.
    vec3 solid = vec3(0.92, 0.94, 0.96) * hemiAmbient(N, u_skyColor, u_groundColor) * 2.0 * u_ambientStrength;

    // What you see through the ornament.
    vec3 through = mix(solid, glassBg, u_transparency);

    // Frost scatters light forward, so the body brightens toward
    // the 'solid' term as u_frost rises. Independent of transparency:
    // even at full transparency, high frost still lifts the body.
    // 0.85 cap so we don't fully obliterate the bg read.
    through = mix(through, solid, clamp(u_frost, 0.0, 0.85));

    // Grazing reflectance: F.x (the Fresnel scalar, equal across
    // channels for our near-neutral F0) ramps from 0 at centre to
    // 1 at silhouette. We brighten 'through' by that factor so
    // edges read as reflective. Without this, glass looks like
    // a flat tinted hole.
    vec3 reflectedBg = mix(through, vec3(1.0), F.x * 0.6);
    through = reflectedBg;

    // specular was set up in flowBlock (possibly iridescence-tinted
    // by the effect's apply).
    vec3 ornament = through + specular;
`;

export const outputBlock = /* glsl */ `
    // Same model as solid: bg always sampled, composite runs
    // unchanged. Inside the silhouette, the user sees their glass
    // composite — including the refracted bg, which is the whole
    // point of glass. Outside the silhouette, alpha drops to 0 with
    // a hard pixel-AA edge — no halo bleed in the cutout.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;

    col = acesTonemap(col);

    // Grain seed: loop-safe in loop mode. Periodic + continuous via
    // sin/cos of integer multiples of the loop phase. See solid/output
    // for the full rationale.
    float loopAngle = u_time / max(u_loopDuration, 0.001) * 6.28318;
    float loopSeed = sin(loopAngle) * 37.0 + cos(loopAngle * 2.0) * 51.0;
    float grainSeed = mix(u_time, loopSeed, step(0.5, u_loopMode));
    col += (hash(v_uv * u_resolution + grainSeed) - 0.5) * 0.018;

    // Sleek silhouette alpha — sharp edge, pixel-AA'd, halo excluded.
    // bg-through-refraction is preserved because col INSIDE the
    // silhouette already contains the refracted bg (see compositeBlock).
    float coverage = smoothstep(0.45, 0.55, inside * mask);
    float alpha = mix(1.0, coverage, step(0.5, u_bgTransparent));
    gl_FragColor = vec4(col, alpha);
`;
