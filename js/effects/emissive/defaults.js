// =========================================================
// EMISSIVE EFFECT — defaults
// =========================================================
// Self-illuminated, animated "hot veins" layer that adds glowing
// emission to the body of ANY material (Solid or Particles). Generic:
// orange reads as lava/magma, blue/green as energy or neon, white as
// raw glow. Off by default.
//
//   strength  — 0..2, overall emission brightness (0 = off)
//   color     — the dominant emission color
//   scale     — noise frequency (higher = finer, denser veins)
//   speed     — 0..2, how fast the veins flow (loop-safe)
//   sharpness — vein contrast: low = broad glow, high = thin cracks
//
export const defaults = {
  enabled:   false,
  strength:  1.3,
  color:     '#FF5A1E',
  scale:     3.5,
  speed:     1.0,
  sharpness: 3.2,
};
