// =========================================================
// SCRATCHES EFFECT — defaults
// =========================================================
// Fine directional surface scratches + uneven gloss. Reads as brushed /
// distressed / battle-worn metal: thin bright streaks that catch the
// light along a dominant direction, plus a subtle break-up of the
// specular so the surface isn't uniformly glossy. Works on any material
// (modulates the specular term). Off by default.
//
//   strength — 0..1.5, how pronounced the scratches + wear are
//   density  — line frequency (higher = finer, more scratches)
//   angle    — dominant scratch direction, degrees
//   coverage — 0..1, how many of the candidate lines actually appear
//
export const defaults = {
  enabled:  false,
  strength: 0.6,
  density:  70,
  angle:    35,
  coverage: 0.45,
};
