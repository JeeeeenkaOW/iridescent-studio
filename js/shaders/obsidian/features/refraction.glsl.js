// =========================================================
// REFRACTION — distort the background through the ornament
// =========================================================
// Obsidian reads as a dark glass: the background is visible through it,
// distorted slightly by the surface normal. Unlike the Glass material,
// this read is heavily darkened in the composite step (it's an
// internal "inside the obsidian" colour, not the dominant look).
//
// Uniforms:
//   u_refraction — magnitude of the normal-driven UV offset
//
export const refractionBlock = /* glsl */ `
    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    vec2 refractOffset = N.xy * u_refraction * aspectFix;
    vec2 bgSampleUV = clamp(v_uv + refractOffset, vec2(0.0), vec2(1.0));
    vec3 throughBg = texture2D(u_bgTex, bgSampleUV).rgb;
`;
