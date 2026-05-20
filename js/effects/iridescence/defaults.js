// =========================================================
// IRIDESCENCE EFFECT — defaults
// =========================================================
// Soap-film rainbow overlay. Material colors stay; a mean-zero
// rainbow sheen rides over the surface, strongest at grazing
// angles. Off by default — enable from the Effects panel.
//
// At enabled=true, intensity=1.0, hue=0 with the Pearl basis, the
// soap film is at full strength: a clearly visible iridescent
// sheen oscillating with cursor position and time.
//
export const defaults = {
  enabled:   false,
  intensity: 1.0,         // 0..1, scales the soap-film overlay
  hue:       0,           // 0..360°, rotates the cosine palette
};

// Pearl-phase basis. Hue slider adds (hue/360°) to all three channels,
// rotating the cosine palette around the colour wheel while preserving
// Pearl's channel offsets. At hue=0 we get the original Pearl phase.
export const PEARL_BASIS = [0.00, 0.18, 0.42];
