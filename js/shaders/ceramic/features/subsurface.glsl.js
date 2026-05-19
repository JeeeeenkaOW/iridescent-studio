// =========================================================
// SUBSURFACE — fake porcelain translucency
// =========================================================
// Real porcelain transmits a small amount of light internally,
// producing that characteristic warm inner glow when held up to a
// light source. We approximate with bloom × sssColor — bloom is
// brightest at silhouette interior (away from edges), so this reads
// as the body "lighting up from within" rather than reflecting.
//
// The sssTint vec3 is added to the diffuse term in the composite
// block. Strength is controlled by u_sssStrength.
//
// Uniforms:
//   u_sssColor    — tint of the inner glow (warm by default)
//   u_sssStrength — 0..1 overall intensity
//
export const subsurfaceBlock = /* glsl */ `
    vec3 sssTint = u_sssColor * bloom * u_sssStrength;
`;
