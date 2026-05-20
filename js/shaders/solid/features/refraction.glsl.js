// =========================================================
// REFRACTION — bg sample distorted by surface normal
// =========================================================
// Reads the background through the ornament with a normal-driven UV
// offset. When u_refraction = 0, throughBg is just the bg at the
// fragment's screen UV (no distortion). Higher values lens the bg
// at silhouette edges where N has more XY component.
//
// The composite step multiplies throughBg by u_refractionMix — that's
// how much of the bg "leaks through" the body. At 0 it's pure opaque
// material; at higher values the body becomes semi-transparent
// glass-like (this is what made the old Obsidian read as dark glass).
//
// Uniforms:
//   u_refraction    — UV offset magnitude (typically 0..0.2)
//   u_refractionMix — how much throughBg adds into the body (0..1)
//
export const refractionBlock = /* glsl */ `
    vec2 aspectFix = vec2(u_resolution.y / u_resolution.x, 1.0);
    vec2 refractOffset = N.xy * u_refraction * aspectFix;
    vec2 bgSampleUV = clamp(v_uv + refractOffset, vec2(0.0), vec2(1.0));
    vec3 throughBg = texture2D(u_bgTex, bgSampleUV).rgb;
`;
