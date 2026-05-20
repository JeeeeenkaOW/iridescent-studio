// =========================================================
// PARTICLES DEFAULTS — material params + lighting + ambient
// =========================================================
// The Particles material renders the source SVG as a field of
// discrete dots. Each "particle" is a grid cell; cells that fall
// inside the silhouette become visible, with size and brightness
// modulated by the underlying albedo + animation noise.
//
// Modes (controlled by u_particleMode):
//   0 = DUST   — particles gently drift in a noise field; static.
//   1 = SMOKE  — particles drift upward with fading + scale change.
//   2 = STARS  — particles twinkle (brightness oscillates), no drift.
//   3 = FRAGMENTS — particles scatter outward from centroid.
//
// Default mode = DUST. The reference look is "the ornament rendered
// as constellation dots".
//
export const defaults = {
  material: {
    // Density: cells per image width. 60 = clearly granular but
    // recognisable; 120 = fine detail; 30 = very sparse.
    density:     80,
    // Particle size: radius as fraction of one cell. 0.35 = small
    // dots with gaps; 0.6 = nearly filled cells; 0.8 = almost solid.
    size:        0.40,
    // How much the per-cell jitter scatters particles off their grid
    // positions. 0 = perfect grid; 1 = each cell's particle can land
    // anywhere within its neighbourhood (smoother visual at the cost
    // of grid pattern).
    jitter:      0.5,
    // Drift animation strength. 0 = static, 1 = particles dance.
    drift:       0.4,
    // Mode index (0..3 per comment above).
    mode:        0,
    // Base color — tints the particle dots.
    baseColor:  '#FFFFFF',
    // Edge softness for the dot's circular falloff. 0.05 = razor
    // sharp dots; 0.3 = soft glowing blobs.
    softness:    0.15,
  },
  // Lighting preset — particles still pick up lighting from the
  // underlying surface normal where they live, so this matters.
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
