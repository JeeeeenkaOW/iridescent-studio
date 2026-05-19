// =========================================================
// CHROMATIC ABERRATION EFFECT — GLSL
// =========================================================
// Resamples albedo with R/G/B offset along X, modulated by bloom so
// the fringing is strongest at silhouette edges. Unlike the original
// Mercury implementation, this is material-agnostic — any material
// gets RGB fringing on its silhouette edges with this effect enabled.
//
// Host material contract:
//   - `texUV`, `sUV` (vec2)    — fitted/clamped sample UVs
//   - `mask` (float)            — silhouette mask, will be overwritten
//   - `bloom` (float)           — edge bloom (drives fringe strength)
//
// We rewrite `mask` so downstream compositing picks up the fringed
// version. Without rewriting mask, the fringe would render then get
// masked back out.
//
export const uniforms = /* glsl */ `
  uniform float u_caStrength;
`;

export const helpers = ``;

// Maximum UV offset at strength=1, edge=1. 0.008 reads as a clearly
// visible but not gaudy fringe at typical viewport sizes.
export const apply = /* glsl */ `
    if (u_caStrength > 0.001) {
      // Edge factor: pure interior = no shift, ornament edge = full shift.
      // bloom is broader than the silhouette, so multiplying by (1-mask*0.7)
      // weights it toward edges and outside-silhouette glow.
      float caEdge = bloom * (1.0 - mask * 0.7) + bloom * mask * 0.4;
      float caAmt  = u_caStrength * 0.008 * caEdge;
      float caR = texture2D(u_albedo, clamp(texUV + vec2(caAmt, 0.0), vec2(0.001), vec2(0.999))).r;
      float caG = texture2D(u_albedo, sUV).g;
      float caB = texture2D(u_albedo, clamp(texUV - vec2(caAmt, 0.0), vec2(0.001), vec2(0.999))).b;
      mask = max(max(caR, caG), caB);
    }
`;
