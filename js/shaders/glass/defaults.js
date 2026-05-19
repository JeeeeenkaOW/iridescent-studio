// =========================================================
// GLASS DEFAULTS — initial uniform values
// =========================================================
// Glass is a refraction-based material: the background behind the
// ornament is sampled with the surface normal as a UV offset, then
// optionally blurred for a frosted look.
//
// Controls (kept minimal per original spec):
//
//   transparency — overall opacity of the ornament. 0 = fully solid,
//                  1 = fully transparent.
//   refraction   — how far the normal distorts the background UV.
//   frost        — radius of the blur applied to the refracted sample.
//
// Lighting preset:
//   Tight, weak highlight that doesn't compete with the refraction
//   read. The Lighting effect can override these if the user wants
//   to push specular strength up.
//
export const defaults = {
  name: 'Glass',

  material: {
    transparency: 0.85,
    refraction:   0.06,
    frost:        0.0,
  },

  lighting: {
    diffuse:   0.0,     // glass diffuse is mostly subsumed by refraction
    specular:  0.9,     // baseline — read by output block as `spec * 0.9`
    shininess: 48.0,    // tight highlight
    height:    0.16,
  },
};
