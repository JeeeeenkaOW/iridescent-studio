// =========================================================
// ROUGHNESS — procedural normal perturbation
// =========================================================
// Three-octave noise added to the surface normal at small scales.
// At u_roughness = 0 this is a no-op (the body returns the original N
// unchanged); higher values produce the stippled volcanic-glass look
// borrowed from the old Obsidian shader.
//
// The 0.45 magnitude factor was chosen by eye on the dice reference:
// at 100% you can see the surface clearly perturbed without losing
// the underlying lighting direction.
//
// Uniforms:
//   u_roughness — 0..1 strength.
//
export const roughnessBlock = /* glsl */ `
    if (u_roughness > 0.001 && mask > 0.01) {
      vec2 r1 = texUV *  80.0;
      vec2 r2 = texUV * 200.0 + vec2(13.7,  4.2);
      vec2 r3 = texUV * 480.0 + vec2(91.1, 27.5);

      float nx = (noise(r1)               - 0.5) * 0.50
               + (noise(r2)               - 0.5) * 0.32
               + (noise(r3)               - 0.5) * 0.18;
      float ny = (noise(r1 + vec2(7.3, 3.1)) - 0.5) * 0.50
               + (noise(r2 + vec2(7.3, 3.1)) - 0.5) * 0.32
               + (noise(r3 + vec2(7.3, 3.1)) - 0.5) * 0.18;

      vec2 perturb = vec2(nx, ny) * u_roughness * 0.45;
      N = normalize(N + vec3(perturb, 0.0));
    }
`;
