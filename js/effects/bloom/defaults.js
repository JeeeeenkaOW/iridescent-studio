// =========================================================
// BLOOM EFFECT — defaults
// =========================================================
// Soft glow ring around the ornament's silhouette. Driven by the
// bloom texture (precomputed from albedo's luminance) masked away
// from the interior. Off by default.
//
// Color seeding:
//   When the effect mounts (or remounts on material switch), it
//   seeds its color picker from the material's `u_haloBaseColor`
//   uniform. Solid ships white (#FFF), Glass ships cool blue
//   (#B2CCE6). The user can override with the color picker; when
//   iridescence is enabled, the chosen color is multiplied by the
//   animated iridescence palette so the bloom picks up the rainbow
//   rather than fighting it.
//
// Strength scales the existing per-material halo intensity (set in
// `u_haloBaseIntensity`) so the slider reads "0%..200% of baseline."
// Baseline intensities differ per material — they were tuned for
// each material's body brightness — so a uniform 0-100 slider
// would look weird across the two. Multiplying preserves the tuning.
//
export const defaults = {
  enabled:  false,
  strength: 1.0,  // 0..2, slider = % * 0.02
};
