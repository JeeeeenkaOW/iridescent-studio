// =========================================================
// ROUGHNESS — procedural surface texture
// =========================================================
// Perturbs the surface normal at small scales using high-frequency
// noise. Approximates the look of the dice reference's procedural
// normal map (4000 random line strokes + 1500 dots in slight RGB
// variations around the neutral normal). The visible result is a
// stippled, broken-up specular highlight — "rough volcanic glass"
// instead of "smooth clearcoat".
//
// We sample two layers of value noise (offset 0.5 in the second so
// they don't correlate) to derive an XY perturbation. The texUV is
// scaled by 240.0 to put the noise at roughly 1/240th of the image
// per cycle, matching the fine grain in the dice reference. The
// perturbation magnitude is gated by u_roughness so the user can
// dial it from smooth glass to heavily stippled.
//
// The perturbation is added to N.xy and then renormalized so we
// don't change the magnitude of the normal — only its direction.
//
// This block must run AFTER sampleBlock (which sets N) and BEFORE
// lightingBlock (which reads N for spec) and fresnelBlock (which
// reads N.z).
//
// Uniforms:
//   u_roughness — 0..1 perturbation strength.
//
export const roughnessBlock = /* glsl */ `
    if (u_roughness > 0.001 && mask > 0.01) {
      vec2 nUV = texUV * 240.0;
      float nx = noise(nUV)            - 0.5;
      float ny = noise(nUV + vec2(7.3, 3.1)) - 0.5;
      // Magnitude: 0.6 at u_roughness=1 reads as clearly stippled
      // without losing the underlying shape lighting.
      vec2 perturb = vec2(nx, ny) * u_roughness * 0.6;
      // Gate by mask so the texture doesn't perturb pixels outside
      // the silhouette (which have no normal data anyway).
      N = normalize(N + vec3(perturb, 0.0));
    }
`;
