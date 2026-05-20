// =========================================================
// ROUGHNESS — procedural normal perturbation (higher-freq + 3D)
// =========================================================
// Three-octave noise added to the surface normal at FINE scales.
//
// Two improvements over the v6/v7 version:
//   1. Frequencies bumped up (200/520/1300 instead of 80/200/480) so
//      the noise reads as fine grain, not chunky cells. At a 1024×
//      raster, the new low-octave is ~5px/cycle — visibly textured
//      without being noisy.
//   2. N.z is reduced based on perturbation magnitude. Just shifting
//      N.xy and re-normalising leaves N.z dominant, so lighting still
//      treats the surface as mostly-flat with a sideways wobble. To
//      sell the surface as truly bumpy, we have to TILT the normal
//      off the screen plane — that means lowering N.z when the
//      sideways perturbation is large. Compensated by sqrt in the
//      normalize step so the lighting feels 3D, not just rippling.
//
// Uniforms:
//   u_roughness — 0..1 strength.
//
export const roughnessBlock = /* glsl */ `
    if (u_roughness > 0.001 && mask > 0.01) {
      vec2 r1 = texUV *  200.0;
      vec2 r2 = texUV *  520.0 + vec2(13.7,  4.2);
      vec2 r3 = texUV * 1300.0 + vec2(91.1, 27.5);

      float nx = (noise(r1)               - 0.5) * 0.50
               + (noise(r2)               - 0.5) * 0.32
               + (noise(r3)               - 0.5) * 0.18;
      float ny = (noise(r1 + vec2(7.3, 3.1)) - 0.5) * 0.50
               + (noise(r2 + vec2(7.3, 3.1)) - 0.5) * 0.32
               + (noise(r3 + vec2(7.3, 3.1)) - 0.5) * 0.18;

      // Sideways perturbation (in N.xy plane).
      vec2 perturb = vec2(nx, ny) * u_roughness * 0.9;

      // Reduce N.z proportional to the perturbation magnitude so the
      // resulting normal feels TILTED, not just sideways-shifted. The
      // multiplier of 0.6 gives a noticeable 3D feel without making
      // the surface read as bristles.
      float pMag = length(perturb);
      float nz = max(N.z - pMag * 0.6, 0.05);

      N = normalize(vec3(N.xy + perturb, nz));
    }
`;
