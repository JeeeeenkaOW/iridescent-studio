// =========================================================
// NOISE — hash function (for grain)
// =========================================================
export const noiseHelpers = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
`;
