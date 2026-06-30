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
  // Tuned so that simply enabling the effect looks like fine brushed metal
  // rather than a heavy cross-hatch: low strength, fine + sparse lines.
  strength: 0.22,
  density:  170,
  angle:    90,
  coverage: 0.25,
};
