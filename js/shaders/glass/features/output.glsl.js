// =========================================================
// COMPOSITE + OUTPUT — assemble the final pixel
// =========================================================
// Glass is layered as:
//
//   1. straight background (texture2D(u_bgTex, v_uv)) — the
//      "outside the ornament" pixels
//   2. refracted+frosted background (glassBg) — what you see
//      "through" the ornament
//   3. specular highlight — a faint white spec on the silhouette
//      so the ornament reads as glass, not just a hole
//
// Transparency:
//   0 → the "solid" base reads as pure white tinted by spec — basically
//       opaque white glass (rarely useful, but the slider should reach
//       this extreme cleanly).
//   1 → ornament is pure refracted bg + spec.
//
// We also gate everything by `inside` (the fitted image rect) and
// `mask` (the ornament silhouette), so transparent areas of the
// SVG stay as straight background.
//
export const outputBlock = /* glsl */ `
    // Bg outside the ornament — straight, no refraction.
    vec3 bg = texture2D(u_bgTex, v_uv).rgb;

    // The "solid" appearance of glass when transparency is 0 —
    // a very light frosted white. Acts as the opaque limit.
    vec3 solid = vec3(0.92, 0.94, 0.96);

    // What you see through the ornament.
    vec3 through = mix(solid, glassBg, u_transparency);

    // Faint specular on the silhouette so the ornament reads as
    // a 3D object catching light, not just a window.
    vec3 specular = vec3(spec) * 0.9;
    vec3 ornament = through + specular;

    // Halo around silhouette edges using the bloom map. Light and
    // monochromatic — we don't want anything as iridescent as Mercury.
    float haloMask = bloom * (1.0 - mask * 0.7);
    vec3 halo = vec3(0.7, 0.8, 0.9) * haloMask * 0.25;

    vec3 fg = ornament * mask + halo;
    vec3 col = mix(bg, bg * (1.0 - mask) + fg, inside);

    float vig = 1.0 - smoothstep(0.35, 1.15, length(v_uv - 0.5));
    col *= vig;
    col += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.018;
    gl_FragColor = vec4(col, 1.0);
`;
