// =========================================================
// SUBSURFACE — fake porcelain-style inner glow
// =========================================================
// Tints the body with bloom * sssColor * sssStrength. Bloom is highest
// at silhouette interior, so this reads as "thicker areas glow from
// within" — the porcelain/ceramic look from the old Ceramic shader.
//
// At u_sssStrength = 0 this contributes nothing (sssTint = vec3(0)).
//
// Uniforms:
//   u_sssColor    — tint of the inner glow
//   u_sssStrength — 0..1 intensity
//
export const subsurfaceBlock = /* glsl */ `
    vec3 sssTint = u_sssColor * bloom * u_sssStrength;
`;
