// =========================================================
// GLASS DEFAULTS — initial uniform values
// =========================================================
// Glass is a refraction-based material: the background behind the
// ornament is sampled with the surface normal as a UV offset, then
// optionally blurred for a frosted look.
//
// Controls (kept minimal per request):
//
//   transparency — overall opacity of the ornament. 0 = fully solid
//                  (no glass), 1 = fully transparent (background
//                  shows through, modulated by refraction + frost).
//   refraction   — how far the normal distorts the background UV.
//                  0 = pure transparency (no lensing), high =
//                  strong lens distortion at silhouette edges.
//   frost        — radius of the blur applied to the refracted
//                  sample. 0 = clear glass, high = heavy frost.
//
//   Spec is fixed at modest values to give the silhouette a faint
//   highlight without competing with the refraction read.
//
export const defaults = {
  name: 'Glass',

  material: {
    transparency: 0.85,   // 0..1
    refraction:   0.06,   // 0..0.20 reasonable range
    frost:        0.0,    // 0..1, mapped internally to a blur radius
  },
};
