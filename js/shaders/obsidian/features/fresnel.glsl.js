// =========================================================
// FRESNEL — rim highlight along silhouette edges
// =========================================================
// Approximates the clearcoat/grazing-angle effect of the dice
// reference: where the surface curves away from the camera, more
// reflection is visible. In 2D screen space we approximate "facing
// away" using the surface normal's Z component — N.z near 1 means
// facing camera (no rim), N.z near 0 means edge-on (full rim).
//
// pow(1 - N.z, u_fresnelPower) gives a tunable falloff. The result
// is added on top of the composited colour later — pure white,
// scaled by u_fresnel.
//
// Uniforms:
//   u_fresnel       — overall rim intensity (0..1)
//   u_fresnelPower  — falloff sharpness (1..8, higher = thinner rim)
//
export const fresnelBlock = /* glsl */ `
    float facing = clamp(N.z, 0.0, 1.0);
    float fresnel = pow(1.0 - facing, u_fresnelPower) * u_fresnel;
`;
