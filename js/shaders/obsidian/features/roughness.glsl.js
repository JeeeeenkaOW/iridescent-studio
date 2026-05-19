// =========================================================
// ROUGHNESS — procedural surface texture (smoother, multi-octave)
// =========================================================
// Perturbs the surface normal at small scales using THREE layers of
// value noise at different frequencies. The original version was
// single-octave at scale 240× → chunky, almost checkerboard-looking.
// Real obsidian roughness has structure across multiple scales:
//   - fine grain (small pits)
//   - medium-scale variation (light/dark patches)
//   - some coarse facets
//
// Three octaves at 80×, 200×, 480× combine for that fracture-pattern
// look. Smoothness via the `noise()` interpolation + the cross-octave
// summation lets the result read as continuous surface roughness
// rather than discrete cells.
//
// Each octave's amplitude decays so the highest-frequency layer
// contributes the least — keeps the perturbation from looking noisy
// noise and instead reads as fine grain on top of broader variation.
//
// Uniforms:
//   u_roughness — 0..1 overall perturbation strength.
//
export const roughnessBlock = /* glsl */ `
    if (u_roughness > 0.001 && mask > 0.01) {
      // Three octaves at increasing frequency, decreasing amplitude.
      // Offsets break correlation between the octaves so they don't
      // line up into visible diagonals.
      vec2 r1 = texUV *  80.0;
      vec2 r2 = texUV * 200.0 + vec2(13.7,  4.2);
      vec2 r3 = texUV * 480.0 + vec2(91.1, 27.5);

      float nx = (noise(r1)               - 0.5) * 0.50
               + (noise(r2)               - 0.5) * 0.32
               + (noise(r3)               - 0.5) * 0.18;
      float ny = (noise(r1 + vec2(7.3, 3.1)) - 0.5) * 0.50
               + (noise(r2 + vec2(7.3, 3.1)) - 0.5) * 0.32
               + (noise(r3 + vec2(7.3, 3.1)) - 0.5) * 0.18;

      // Magnitude scaling: u_roughness 1.0 reads as visibly stippled
      // without losing the underlying lighting direction. The 0.45
      // factor was chosen by eye to match the dice reference density.
      vec2 perturb = vec2(nx, ny) * u_roughness * 0.45;

      N = normalize(N + vec3(perturb, 0.0));
    }
`;
