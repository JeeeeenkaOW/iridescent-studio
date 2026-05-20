// =========================================================
// PARTICLES DEFAULTS — material params + lighting + ambient
// =========================================================
// The Particles material renders the source SVG as a field of
// discrete dots. Each grid cell becomes a particle; cells inside
// the silhouette become visible.
//
// MOTIONS (all independent, can be combined):
//   - drift   — particles wobble in an fbm noise field
//   - rise    — particles drift upward with cycle fade
//   - twinkle — per-cell brightness oscillation
//   - scatter — particles push radially outward from centre
//
// SHAPES (single-select):
//   0 = circle, 1 = square, 2 = diamond, 3 = ring
//
export const defaults = {
  material: {
    density:     80,
    size:        0.40,
    jitter:      0.5,
    softness:    0.15,
    shape:       0,
    // Default motion: mild drift only. User can combine any of these.
    motionDrift:   0.4,
    motionRise:    0.0,
    motionTwinkle: 0.0,
    motionScatter: 0.0,
    baseColor:  '#FFFFFF',
    // Per-particle hue shift. Each dot gets a stable identity from its
    // grid-cell hash, mapped into the Iridescence effect's palette.
    // 0 = today's look (base color × albedo). 1 = each dot is pure
    // palette color. Gated by Iridescence intensity, so turning the
    // Iridescence effect off restores the original look regardless
    // of this slider.
    hueShift:   0.0,
  },
  lighting: {
    diffuse:        0.45,
    specular:       1.40,
    shininess:      32.0,
    height:         0.16,
    color:          '#FFFFFF',
    ambientStrength: 1.20,
  },
  ambient: {
    sky:    '#7A8AAA',
    ground: '#403028',
  },
};
