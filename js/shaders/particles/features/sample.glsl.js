// =========================================================
// PARTICLES SAMPLE — minimal preamble
// =========================================================
// We need texUV (fitted) and the `inside` mask. Unlike solid/glass,
// we DON'T sample albedo/normal/bloom here — that happens per
// particle inside particles.glsl.js at the particle's centre, not
// the fragment's position.
//
// We DO declare sUV (clamped texUV) because the Chromatic Aberration
// effect's apply block reads it as part of the host-material contract.
// Without this, the assembled shader has an undefined variable and
// the WHOLE shader fails to compile — silently — leaving particles
// mode showing a black screen. (Caught when investigating "particles
// don't render": the GLSL parser flagged `sUV` as undefined.)
//
export const sampleBlock = /* glsl */ `
    float screenAspect = u_resolution.x / u_resolution.y;
    vec2 vUV = v_uv;

    vec3 fit = fitUV(vUV, screenAspect);
    vec2 texUV = fit.xy;
    float inside = fit.z;

    // Clamped sample UV — satisfies the CA effect's contract. Even
    // though we don't use this directly in the particles pipeline
    // (sampling happens at per-particle centres), CA's apply block
    // reads it.
    vec2 sUV = clamp(texUV, vec2(0.001), vec2(0.999));
`;
