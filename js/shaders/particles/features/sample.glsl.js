// =========================================================
// PARTICLES SAMPLE — minimal preamble
// =========================================================
// We need texUV (fitted) and the `inside` mask. Unlike solid/glass,
// we DON'T sample albedo/normal/bloom here — that happens per
// particle inside particles.glsl.js at the particle's centre, not
// the fragment's position.
//
export const sampleBlock = /* glsl */ `
    float screenAspect = u_resolution.x / u_resolution.y;
    vec2 vUV = v_uv;

    vec3 fit = fitUV(vUV, screenAspect);
    vec2 texUV = fit.xy;
    float inside = fit.z;
`;
