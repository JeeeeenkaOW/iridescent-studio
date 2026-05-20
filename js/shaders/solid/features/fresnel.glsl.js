// =========================================================
// FRESNEL — rim highlight along silhouette edges
// =========================================================
// Approximates clearcoat / grazing-angle reflection. Where N.z is
// low (edges curving away from camera), more reflection shows. The
// resulting `fresnel` scalar is added to the body in composite,
// scaled by u_fresnel and shaped by u_fresnelPower.
//
// At u_fresnel = 0, no rim. Higher values produce a bright outline;
// higher u_fresnelPower thins that outline.
//
// Uniforms:
//   u_fresnel       — intensity (0..1)
//   u_fresnelPower  — falloff sharpness (1..8)
//
export const fresnelBlock = /* glsl */ `
    float facing = clamp(N.z, 0.0, 1.0);
    float fresnel = pow(1.0 - facing, u_fresnelPower) * u_fresnel;
`;
