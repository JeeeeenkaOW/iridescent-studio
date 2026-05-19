// =========================================================
// CHROMATIC ABERRATION — RGB split inside the mercury blob
// =========================================================
// Resamples the albedo with R/G/B offset along X. Only fires when the
// blob is above a small threshold so it doesn't cost us elsewhere.
//
// Note: this rewrites `mask` based on the split samples, which is what
// creates the rainbow fringe on ornament edges inside the blob.
//
// Tuneable (hardcoded):
//   - CA strength:  0.006 * blob   (multiplied by blob so it ramps in smoothly)
//
export const chromaticAberrationBlock = /* glsl */ `
    if(blob > 0.01){
      float ca = blob * 0.006;
      float r = texture2D(u_albedo, clamp(texUV + vec2(ca, 0.0), vec2(0.001), vec2(0.999))).r;
      float gC = texture2D(u_albedo, sUV).g;
      float b = texture2D(u_albedo, clamp(texUV - vec2(ca, 0.0), vec2(0.001), vec2(0.999))).b;
      mask = max(max(r, gC), b);
    }
`;
